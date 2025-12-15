import { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | RealWorth.ai',
  description: 'Privacy Policy for RealWorth.ai - Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Last updated: December 5, 2025</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Introduction</h2>
            <p className="text-slate-600 mb-4">
              RealWorth.ai (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy and is committed to protecting
              your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-slate-700 mb-2">Account Information</h3>
            <p className="text-slate-600 mb-4">
              When you sign in with Google OAuth, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Your name</li>
              <li>Email address</li>
              <li>Profile picture URL</li>
              <li>Google account identifier</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">User Content</h3>
            <p className="text-slate-600 mb-4">
              When you use our appraisal service, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Images you upload for appraisal</li>
              <li>Appraisal results and history</li>
              <li>Collections and organization data</li>
              <li>Chat conversations with our AI assistant (Pro users)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 mb-2">Usage Information</h3>
            <p className="text-slate-600 mb-4">
              We automatically collect certain information about your device and usage:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Pages visited and features used</li>
              <li>Time spent on the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. How We Use Your Information</h2>
            <p className="text-slate-600 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your appraisal requests using AI analysis</li>
              <li>Manage your account and subscription</li>
              <li>Send you service-related communications</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Data Storage and Security</h2>
            <p className="text-slate-600 mb-4">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Database:</strong> Supabase (PostgreSQL) with Row Level Security (RLS)</li>
              <li><strong>Image Storage:</strong> Supabase Storage with access controls</li>
              <li><strong>Hosting:</strong> Vercel with SSL/TLS encryption</li>
              <li><strong>Payments:</strong> Stripe (PCI-DSS compliant)</li>
            </ul>
            <p className="text-slate-600 mb-4">
              We implement appropriate technical and organizational measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Third-Party Services</h2>
            <p className="text-slate-600 mb-4">
              We use the following third-party services that may collect or process your data:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Google:</strong> Authentication (OAuth) and AI services (Gemini)</li>
              <li><strong>Supabase:</strong> Database, authentication, and file storage</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>Vercel:</strong> Hosting and analytics</li>
            </ul>
            <p className="text-slate-600 mb-4">
              Each of these services has their own privacy policy governing their use of your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Data Sharing</h2>
            <p className="text-slate-600 mb-4">
              We do not sell your personal data. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights or the rights of others</li>
              <li>With service providers who assist in operating our Service (under strict confidentiality)</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Your Rights</h2>
            <p className="text-slate-600 mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your data</li>
            </ul>
            <p className="text-slate-600 mb-4">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:support@realworth.ai" className="text-teal-600 hover:text-teal-700 underline">
                support@realworth.ai
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Data Retention</h2>
            <p className="text-slate-600 mb-4">
              We retain your personal data for as long as your account is active or as needed to provide
              you with our Service. You may delete your account at any time, and we will delete your
              personal data within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-slate-600 mb-4">
              Our Service is not intended for children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information
              from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Changes to This Policy</h2>
            <p className="text-slate-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Your
              continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:{' '}
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
