import { FileText } from 'lucide-react';
import { LegalPage, Section } from './PrivacyPolicy';

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" icon={<FileText className="h-6 w-6 text-sky-400" />} updated="July 12, 2026">
      <Section heading="Agreement">
        These Terms govern your use of EverAfter AI, operated by Wise &amp; Savvy LLC (“EverAfter,”
        “we,” “us”). By creating an account or using the service you agree to these Terms and to
        our Privacy Policy. If you do not agree, do not use the service.
      </Section>

      <Section heading="The service">
        EverAfter provides digital-legacy tools (family records, memory preservation, vault items,
        time capsules, AI personalities you train) and wellness companions (health dashboards,
        device integrations, an AI health companion). Features vary by plan, and we may improve or
        change features over time.
      </Section>

      <Section heading="Health disclaimer">
        EverAfter is <strong className="text-slate-200">not a medical device and does not provide medical advice, diagnosis, or
        treatment</strong>. Health features, including St. Raphael, offer general wellness information
        derived from data you connect. Never rely on the service for medical decisions, never
        disregard professional advice because of something the service showed you, and call your
        local emergency number in an emergency.
      </Section>

      <Section heading="Financial disclaimer">
        Budgeting and finance features are informational tools, not financial, investment, tax, or
        legal advice. Vault and legacy features help you organize and share your wishes; they are
        not a substitute for a legally executed will or estate plan, and you are responsible for
        the legal validity of your estate documents.
      </Section>

      <Section heading="Your account and content">
        You must be at least 13 (or the higher minimum age of your jurisdiction) and provide
        accurate information. You keep ownership of the content you upload. You grant us the
        limited license needed to store, process, and display it to operate the service —
        including releasing designated content to the recipients you configure. You are
        responsible for having the right to upload content about others, including family members.
      </Section>

      <Section heading="AI features">
        AI-generated responses and AI personalities are probabilistic reconstructions, not the
        actual person, and can be wrong. Do not treat AI output as professional advice of any
        kind. You must not use AI features to impersonate a living person without their consent or
        to deceive others.
      </Section>

      <Section heading="Acceptable use">
        Do not misuse the service: no unlawful content or conduct, no attempts to access other
        users' data, no probing or disrupting our systems, no reselling the service, and no
        uploading of malicious code.
      </Section>

      <Section heading="Subscriptions and billing">
        Paid plans are billed through Stripe on a recurring basis until cancelled. You can cancel
        at any time, effective at the end of the current billing period; amounts already charged
        are non-refundable except where the law requires otherwise. Prices may change with notice
        before your next renewal.
      </Section>

      <Section heading="Legacy release">
        Legacy features release content according to the rules you configure (dates, custodian
        approval, inactivity timeouts). You are responsible for keeping recipients and rules
        current. We will act in good faith on the rules as configured and are not liable for
        releases that follow them.
      </Section>

      <Section heading="Termination">
        You may stop using the service and request account deletion at any time. We may suspend or
        terminate accounts that violate these Terms, with notice where practicable. Sections that
        by their nature should survive (disclaimers, liability limits) survive termination.
      </Section>

      <Section heading="Warranties and liability">
        The service is provided “as is” and “as available,” without warranties of any kind, express
        or implied. To the maximum extent permitted by law, our total liability for any claim
        arising out of the service is limited to the amounts you paid us in the 12 months before
        the claim, and we are not liable for indirect, incidental, or consequential damages.
        Nothing in these Terms limits liability that cannot lawfully be limited.
      </Section>

      <Section heading="Governing law and changes">
        These Terms are governed by the laws of the State of Delaware, USA, without regard to
        conflict-of-law rules, and disputes will be resolved in the state or federal courts
        located in Delaware, unless the consumer-protection law of your place of residence
        requires otherwise. We may update these Terms; material changes will be posted here with a
        new date, and continued use after changes means you accept them.
      </Section>

      <Section heading="Contact">
        Questions about these Terms:{' '}
        <a className="text-sky-400 underline hover:text-sky-300" href="mailto:wiseandsavvyllc@gmail.com">wiseandsavvyllc@gmail.com</a>.
      </Section>
    </LegalPage>
  );
}
