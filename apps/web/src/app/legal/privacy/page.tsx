export default function PrivacyPage() {
    return (
        <div className="w-full">
            <div className="prose prose-gray max-w-none">
                <h1>Privacy Policy</h1>
                <p className="text-sm text-gray-600 mb-8">
                    Last updated: October 2025
                </p>

                <h2>1. Introduction</h2>
                <p>
                    JSR Software Inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates StupidNeko, a language learning progress tracking platform
                    available as a web application, mobile app, and browser extension. This Privacy Policy explains how we collect,
                    use, disclose, and protect your information when you use our services.
                </p>

                <h2>2. Information We Collect</h2>

                <h3>2.1 Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul>
                    <li>Name and email address (via Google or Discord OAuth authentication)</li>
                    <li>Profile image (if provided through OAuth)</li>
                    <li>Timezone and display preferences</li>
                    <li>Integration keys for browser extension connectivity</li>
                </ul>

                <h3>2.2 Learning Activity Data</h3>
                <p>We collect data about your language learning activities:</p>
                <ul>
                    <li>URLs of websites you explicitly mark for tracking</li>
                    <li>Time spent on tracked pages</li>
                    <li>Page titles and timestamps</li>
                    <li>Experience points (XP) earned</li>
                    <li>Learning streaks and progress metrics</li>
                    <li>Notes and session logs you create</li>
                </ul>

                <h3>2.3 Integration Data</h3>
                <p>When you connect third-party services, we collect:</p>
                <ul>
                    <li>Activity metadata from YouTube and Spotify</li>
                    <li>Content titles and session durations</li>
                    <li>Usage patterns and frequency</li>
                </ul>

                <h3>2.4 Browser Extension Data</h3>
                <p>Our browser extension collects:</p>
                <ul>
                    <li>URLs you explicitly mark for tracking (any language learning content)</li>
                    <li>Page titles and timestamps</li>
                    <li>Time spent on tracked pages</li>
                    <li>Extension usage statistics</li>
                </ul>

                <h3>2.5 Technical Data</h3>
                <p>We automatically collect:</p>
                <ul>
                    <li>Device information and browser type</li>
                    <li>IP address and general location</li>
                    <li>Usage analytics and performance data</li>
                    <li>Error logs and crash reports</li>
                </ul>

                <h2>3. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul>
                    <li>Track and display your language learning progress</li>
                    <li>Calculate streaks, XP, and learning statistics</li>
                    <li>Generate insights and automatic categorization</li>
                    <li>Provide community features like leaderboards</li>
                    <li>Celebrate milestones through Discord integration</li>
                    <li>Improve our services through analytics</li>
                    <li>Provide customer support</li>
                </ul>

                <h2>4. Information Sharing</h2>

                <h3>4.1 Service Providers</h3>
                <p>We share information with:</p>
                <ul>
                    <li><strong>Convex</strong>: Our backend database and server infrastructure</li>
                    <li><strong>Google/Discord</strong>: For OAuth authentication</li>
                    <li><strong>Analytics Services</strong>: To understand usage patterns and improve our service</li>
                </ul>

                <h3>4.2 Public Community Features</h3>
                <p>
                    Your profile information, activity history, and learning statistics may be visible to other users
                    through leaderboards and community features. You can hide your profile from public view in your account settings.
                </p>

                <h3>4.3 Discord Integration</h3>
                <p>
                    When you reach learning milestones, we may share celebration messages to our Discord community
                    (with your username and achievement details).
                </p>

                <h2>5. Your Rights and Choices</h2>

                <h3>5.1 Access and Control</h3>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate information</li>
                    <li>Download your data (data portability)</li>
                    <li>Delete your account and data</li>
                    <li>Opt out of analytics tracking</li>
                </ul>

                <h3>5.2 Profile Privacy</h3>
                <p>
                    You can control your privacy settings to hide your profile from public leaderboards
                    and community features.
                </p>

                <h2>6. Data Retention</h2>
                <p>
                    When you delete your account, we will anonymize your personal data but may retain
                    anonymized usage statistics for analytics purposes. This helps us improve our service
                    while protecting your privacy.
                </p>

                <h2>7. Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect your personal
                    information against unauthorized access, alteration, disclosure, or destruction. However,
                    no method of transmission over the internet is 100% secure.
                </p>

                <h2>8. Browser Extension Permissions</h2>
                <p>Our browser extension requests the following permissions:</p>
                <ul>
                    <li><strong>activeTab</strong>: To access the current tab&apos;s URL and title</li>
                    <li><strong>tabs</strong>: To track time spent on marked pages</li>
                    <li><strong>storage</strong>: To store your tracking preferences locally</li>
                </ul>
                <p>
                    The extension only tracks URLs you explicitly mark for tracking and does not collect
                    data from pages you haven&apos;t designated for language learning.
                </p>

                <h2>9. Children&apos;s Privacy</h2>
                <p>
                    Our service is not intended for users under 13 years of age. We do not knowingly
                    collect personal information from children under 13.
                </p>

                <h2>10. International Users</h2>
                <p>
                    If you are located outside the United States, please note that your information
                    will be transferred to and processed in the United States. By using our service,
                    you consent to this transfer.
                </p>

                <h2>11. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any
                    material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                </p>

                <h2>12. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy or our data practices,
                    please contact us at:
                </p>
                <p>
                    <strong>Email:</strong> joshua@stupidneko.com<br />
                    <strong>Company:</strong> JSR Software Inc.
                </p>
            </div>
        </div>
    );
}