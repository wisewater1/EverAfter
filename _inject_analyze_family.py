"""Injects analyze_family() bridge into ContagionEngine before singleton."""

bridge = """

    # -- Trinity Synapse bridge --------------------------------------------------

    def analyze_family(self, members, relationship_graph=None, consent_map=None):
        \"\"\"Synchronous bridge for TrinitySynapse.contagion_graph().\"\"\"
        import asyncio

        if relationship_graph:
            weight_map = {}
            for edge in relationship_graph:
                w = float(edge.get("weight", 0.3))
                for mid in (edge.get("from"), edge.get("to")):
                    if mid:
                        weight_map[mid] = max(weight_map.get(mid, 0.0), w)
            for m in members:
                m["_relationship_weight"] = weight_map.get(m.get("id", ""), 0.3)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(
                        asyncio.run, self.analyze_household(members, consent_map)
                    )
                    return future.result(timeout=10)
            else:
                return loop.run_until_complete(
                    self.analyze_household(members, consent_map)
                )
        except Exception as exc:
            return {
                "error": str(exc),
                "contagion_hotspots": [],
                "contagion_chains": [],
                "household_prescriptions": [],
                "household_risk_level": "unknown",
                "narrative": "ContagionEngine unavailable.",
            }
"""

filepath = r"backend/app/services/causal_twin/contagion_engine.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

marker = "# \u2500\u2500 Singleton"
if "analyze_family" not in content:
    idx = content.rindex(marker)
    content = content[:idx] + bridge + "\n\n" + content[idx:]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Done: analyze_family injected into ContagionEngine")
else:
    print("Skipped: analyze_family already present")
