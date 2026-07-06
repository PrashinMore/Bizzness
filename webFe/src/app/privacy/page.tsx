'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  // You can update this date when the policy changes
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Update this with your contact email
  const contactEmail = 'prashin@ezcommerse.com';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-16">
      <div className="w-full max-w-3xl rounded-2xl bg-surface p-8 shadow-lg">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted hover:text-ink underline underline-offset-4"
          >
            ← Back to home
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-ink mb-2">
          Privacy Policy for Biznes App
        </h1>
        
        <p className="text-sm text-muted mb-8">
          Last updated: {lastUpdated}
        </p>

        <div className="prose prose-zinc max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">
              Data Collection
            </h2>
            <p className="text-muted mb-4">
              This app collects the following data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted ml-4">
              <li>
                <strong>Camera access:</strong> Used to take product photos for inventory management
              </li>
              <li>
                Product images are stored securely on our servers
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">
              Data Sharing
            </h2>
            <p className="text-muted">
              We do not share your data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">
              Contact
            </h2>
            <p className="text-muted">
              For questions or concerns about this privacy policy, please contact us at:{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-ink font-medium underline underline-offset-4 hover:text-muted"
              >
                {contactEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

