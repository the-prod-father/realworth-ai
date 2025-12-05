import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | RealWorth.ai',
  description: 'Terms of Service for RealWorth.ai - AI-powered item appraisals and valuations.',
};

export default function TermsPage() {
  return (
    <>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-teal-600 hover:text-teal-700">
            RealWorth.ai
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: December 5, 2025</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600 mb-4">
              By accessing or using RealWorth.ai (&quot;Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Description of Service</h2>
            <p className="text-slate-600 mb-4">
              RealWorth.ai provides AI-powered item appraisal and valuation estimates. Our Service uses artificial
              intelligence to analyze images of items and provide estimated value ranges based on publicly available
              market data and AI analysis.
            </p>
            <p className="text-slate-600 mb-4 font-medium">
              Important: Our valuations are AI-generated estimates for informational and entertainment purposes only.
              They do not constitute professional appraisals, certifications, or guarantees of value. See our{' '}
              <Link href="/disclaimer" className="text-teal-600 hover:text-teal-700 underline">
                Disclaimer
              </Link>{' '}
              for more details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. User Accounts</h2>
            <p className="text-slate-600 mb-4">
              To access certain features of the Service, you must create an account using Google OAuth authentication.
              You are responsible for maintaining the confidentiality of your account and for all activities that
              occur under your account.
            </p>
            <p className="text-slate-600 mb-4">
              You agree to provide accurate information and to update your information as necessary. We reserve
              the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. User Content</h2>
            <p className="text-slate-600 mb-4">
              You retain ownership of any images and content you upload to the Service. By uploading content,
              you grant us a non-exclusive, worldwide license to use, process, and store your content solely
              for the purpose of providing the Service.
            </p>
            <p className="text-slate-600 mb-4">
              You represent that you have the right to upload any content you submit and that your content
              does not violate any third-party rights or applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Subscription and Payments</h2>
            <p className="text-slate-600 mb-4">
              RealWorth.ai offers both free and paid subscription tiers. Free users receive a limited number of
              appraisals per month. Pro subscribers receive unlimited appraisals and additional features.
            </p>
            <p className="text-slate-600 mb-4">
              Payments are processed through Stripe. By subscribing, you agree to Stripe&apos;s terms of service.
              Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time
              through your account settings or the Stripe customer portal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Intellectual Property</h2>
            <p className="text-slate-600 mb-4">
              The Service, including its design, features, and content (excluding user-uploaded content),
              is owned by RealWorth.ai and protected by intellectual property laws. You may not copy, modify,
              distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Limitation of Liability</h2>
            <p className="text-slate-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REALWORTH.AI SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF
              PROFITS, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-slate-600 mb-4">
              Our total liability for any claims arising from your use of the Service shall not exceed the
              amount you paid us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-slate-600 mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Termination</h2>
            <p className="text-slate-600 mb-4">
              We may terminate or suspend your access to the Service at any time, with or without cause,
              with or without notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Changes to Terms</h2>
            <p className="text-slate-600 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of significant
              changes by posting the new terms on this page with an updated effective date. Your continued
              use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Governing Law</h2>
            <p className="text-slate-600 mb-4">
              These terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">12. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions about these Terms of Service, please contact us at:{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
