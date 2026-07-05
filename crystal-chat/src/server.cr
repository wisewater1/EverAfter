# EverAfter Saints Chat -- Crystal prototype
#
# Implements the same contract as crystal-chat/pybench/app.py so the two can
# be benchmarked head to head. Stdlib only: HTTP::Server, JSON, Mutex.
# No external API calls are made; the "LLM" is a deterministic stub that
# assembles a reply from persona + family context + the user's message, after
# a fixed 30ms sleep meant to stand in for real model compute latency.

require "http/server"
require "json"

# ── Config ──────────────────────────────────────────────────────

PORT = (ENV["PORT"]? || "8081").to_i
MAX_BODY_BYTES = 100_000 # 100 KB request body ceiling (see docs for rationale)
MAX_HISTORY_TURNS = 50   # cap stored (user+assistant) messages per session

FIXTURE_PATH = ENV["FAMILY_FIXTURE_PATH"]? || File.expand_path("../fixtures/family.json", __DIR__)

PERSONAS = {
  "michael" => "You are Archangel Michael, protector and warrior of light.",
  "joseph"  => "You are St. Joseph, quiet guardian of family, home, and lineage.",
  "raphael" => "You are St. Raphael, a compassionate health companion.",
  "gabriel" => "You are Archangel Gabriel, herald and messenger of hope.",
  "anthony" => "You are St. Anthony, patron of the lost and forgotten.",
}

PERSONA_GREETING = {
  "michael" => "Stand firm -- I am with you.",
  "joseph"  => "Peace to your household.",
  "raphael" => "I'm here with you, gently and without judgment.",
  "gabriel" => "Good news travels -- listen closely.",
  "anthony" => "What is lost can still be found.",
}

# ── Family fixture models ───────────────────────────────────────

struct FamilyMember
  include JSON::Serializable
  property id : String
  property firstName : String
  property lastName : String
  property gender : String
  property birthDate : String?
  property deathDate : String?
  property birthPlace : String?
  property generation : Int32
  property bio : String?

  def full_name : String
    "#{firstName} #{lastName}"
  end
end

struct FamilyRelationship
  include JSON::Serializable
  property id : String
  property fromId : String
  property toId : String
  property type : String
  property marriageDate : String?
end

struct FamilyEvent
  include JSON::Serializable
  property id : String
  property memberId : String
  property memberName : String
  property type : String
  property date : String
  property title : String
  property description : String?
end

struct FamilyData
  include JSON::Serializable
  property members : Array(FamilyMember)
  property relationships : Array(FamilyRelationship)
  property events : Array(FamilyEvent)
end

FAMILY = FamilyData.from_json(File.read(FIXTURE_PATH))

def member_name(id : String) : String
  m = FAMILY.members.find { |mm| mm.id == id }
  m ? m.full_name : id
end

def find_referenced_member(text : String) : FamilyMember?
  lower = text.downcase
  # Prefer full-name matches before falling back to first-name-only matches
  FAMILY.members.find { |m| lower.includes?(m.full_name.downcase) } ||
    FAMILY.members.find { |m| lower.includes?(m.firstName.downcase) }
end

def relationships_summary(member : FamilyMember) : String
  parents = FAMILY.relationships.select { |r| r.type == "parent" && r.toId == member.id }.map { |r| member_name(r.fromId) }
  spouse_rel = FAMILY.relationships.find { |r| r.type == "spouse" && (r.fromId == member.id || r.toId == member.id) }
  children = FAMILY.relationships.select { |r| r.type == "parent" && r.fromId == member.id }.map { |r| member_name(r.toId) }
  siblings = FAMILY.relationships.select { |r| r.type == "sibling" && (r.fromId == member.id || r.toId == member.id) }
    .map { |r| r.fromId == member.id ? member_name(r.toId) : member_name(r.fromId) }

  parts = [] of String
  parts << "parents: #{parents.join(", ")}" unless parents.empty?
  if spouse_rel
    other_id = spouse_rel.fromId == member.id ? spouse_rel.toId : spouse_rel.fromId
    parts << "spouse: #{member_name(other_id)}"
  end
  parts << "children: #{children.join(", ")}" unless children.empty?
  parts << "siblings: #{siblings.join(", ")}" unless siblings.empty?
  parts.empty? ? "no recorded relationships" : parts.join("; ")
end

def build_context_summary(referenced : FamilyMember?, living : Array(FamilyMember)) : String
  String.build do |s|
    if referenced
      s << "Referenced family member: #{referenced.full_name} (generation #{referenced.generation}"
      s << ", b. #{referenced.birthDate}" if referenced.birthDate
      s << ", d. #{referenced.deathDate}" if referenced.deathDate
      s << ") -- #{relationships_summary(referenced)}. "
    else
      s << "No specific family member was referenced in the message. "
    end
    s << "Living members (#{living.size}): #{living.map(&.firstName).join(", ")}. "
    s << "Family graph: #{FAMILY.members.size} members, #{FAMILY.relationships.size} relationships, #{FAMILY.events.size} recorded events."
  end
end

def build_reply(saint_id : String, context_used : String, message : String) : String
  greeting = PERSONA_GREETING[saint_id]
  "#{greeting} #{context_used} You asked: \"#{message}\""
end

# ── Session store (fiber-safe) ──────────────────────────────────

alias Turn = NamedTuple(role: String, content: String)

class SessionStore
  def initialize
    @sessions = Hash(String, Array(Turn)).new
    @mutex = Mutex.new
  end

  def append(session_id : String, role : String, content : String) : Int32
    @mutex.synchronize do
      history = @sessions[session_id] ||= [] of Turn
      history << {role: role, content: content}
      overflow = history.size - MAX_HISTORY_TURNS
      history.shift(overflow) if overflow > 0
      history.size
    end
  end

  def size(session_id : String) : Int32
    @mutex.synchronize { @sessions[session_id]?.try(&.size) || 0 }
  end

  def session_count : Int32
    @mutex.synchronize { @sessions.size }
  end
end

SESSIONS = SessionStore.new

# ── HTTP helpers ─────────────────────────────────────────────────

CHAT_ROUTE = /\A\/api\/v1\/saints\/([a-zA-Z0-9_-]+)\/chat\z/

def json_error(response : HTTP::Server::Response, status : Int32, code : String, message : String, hint : String)
  response.status_code = status
  response.content_type = "application/json"
  response.print({code: code, message: message, hint: hint}.to_json)
end

# Reads the body up to `limit` bytes. Returns nil if the body exceeds the
# limit (caller should respond 413) instead of buffering an unbounded body.
def read_body_limited(io : IO, limit : Int32) : String?
  buffer = IO::Memory.new
  chunk = Bytes.new(16_384)
  total = 0
  loop do
    read = io.read(chunk)
    break if read == 0
    total += read
    return nil if total > limit
    buffer.write(chunk[0, read])
  end
  buffer.to_s
end

def stream_reply(context : HTTP::Server::Context, reply : String, session_id : String, saint_id : String, context_used : String)
  response = context.response
  response.content_type = "text/event-stream"
  response.headers["Cache-Control"] = "no-cache"
  response.headers["X-Accel-Buffering"] = "no"

  words = reply.split(" ")
  words.each_slice(4) do |slice|
    response.print("data: #{slice.join(" ")}\n\n")
    response.flush
  end

  done_payload = {done: true, session_id: session_id, saint_id: saint_id, context_used: context_used}.to_json
  response.print("data: #{done_payload}\n\n")
  response.flush
end

def handle_chat(context : HTTP::Server::Context, saint_id : String)
  request = context.request
  response = context.response

  unless PERSONAS.has_key?(saint_id)
    json_error(response, 404, "SAINT_NOT_FOUND", "Unknown saint_id '#{saint_id}'", "Use one of: #{PERSONAS.keys.join(", ")}")
    return
  end

  body_io = request.body
  raw_body = ""
  if body_io
    result = read_body_limited(body_io, MAX_BODY_BYTES)
    if result.nil?
      json_error(response, 413, "PAYLOAD_TOO_LARGE", "Request body exceeds #{MAX_BODY_BYTES} bytes", "Reduce the request body size")
      return
    end
    raw_body = result
  end

  if raw_body.strip.empty?
    json_error(response, 400, "EMPTY_BODY", "Request body must be JSON", "Send a JSON body like {\"message\": \"...\"}")
    return
  end

  parsed = begin
    JSON.parse(raw_body)
  rescue ex : JSON::ParseException
    json_error(response, 400, "BAD_JSON", "Malformed JSON body", "Ensure the request body is valid JSON")
    return
  end

  message = parsed["message"]?.try(&.as_s?) || ""
  if message.strip.empty?
    json_error(response, 400, "MISSING_MESSAGE", "\"message\" field is required and must be a non-empty string", "Include a non-empty message field in the JSON body")
    return
  end

  session_id = parsed["session_id"]?.try(&.as_s?)
  session_id = "sess_#{Random::Secure.hex(12)}" if session_id.nil? || session_id.empty?

  extra_context = parsed["context"]?.try(&.as_s?) || ""

  SESSIONS.append(session_id, "user", message)

  referenced = find_referenced_member("#{message} #{extra_context}")
  living = FAMILY.members.select { |m| m.deathDate.nil? }
  context_used = build_context_summary(referenced, living)

  # Simulate model compute latency (deterministic stub, no external calls).
  sleep 30.milliseconds

  reply = build_reply(saint_id, context_used, message)
  SESSIONS.append(session_id, "assistant", reply)

  if request.query_params["stream"]? == "1"
    stream_reply(context, reply, session_id, saint_id, context_used)
  else
    response.content_type = "application/json"
    response.print({message: reply, session_id: session_id, saint_id: saint_id, context_used: context_used}.to_json)
  end
end

# ── Server ───────────────────────────────────────────────────────

server = HTTP::Server.new do |context|
  request = context.request
  response = context.response

  if request.method == "GET" && request.path == "/healthz"
    response.content_type = "application/json"
    response.print({status: "ok"}.to_json)
  elsif request.method == "POST" && (match = CHAT_ROUTE.match(request.path))
    handle_chat(context, match[1])
  else
    json_error(response, 404, "NOT_FOUND", "Route not found", "Verify the path and HTTP method")
  end
end

address = server.bind_tcp "0.0.0.0", PORT
puts "crystal-chat listening on http://#{address} (fixture: #{FIXTURE_PATH}, members: #{FAMILY.members.size})"
server.listen
