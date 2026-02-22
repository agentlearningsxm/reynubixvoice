import React from 'react';

const Privacy: React.FC = () => (
    <section className="pt-40 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h1 className="text-4xl font-bold font-display text-text-primary mb-3">Privacy Policy</h1>
            <p className="text-sm text-text-secondary mb-12">Last updated: February 2026</p>

            <div className="prose prose-lg max-w-none text-text-secondary space-y-8">

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">1. Who We Are</h2>
                    <p>ReynubixVoice ("we", "us", "our") provides AI voice receptionist services to businesses. Our registered business operates under Reynubix. You can reach us at <a href="mailto:contact@reynubixvoice.com" className="text-brand-primary hover:underline">contact@reynubixvoice.com</a>.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">2. What Data We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong className="text-text-primary">Voice / Audio Data:</strong> When you use the interactive demo on our website, your voice is processed in real time by Google's Gemini API. We do not store audio recordings.</li>
                        <li><strong className="text-text-primary">Contact Information:</strong> When you book a call via Cal.com, your name, email, and any information you provide are handled by Cal.com's platform.</li>
                        <li><strong className="text-text-primary">Usage Analytics:</strong> We may collect anonymized usage data (pages visited, browser type, country) to improve our service.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">3. How We Use Your Data</h2>
                    <p>We use collected data to: provide and improve our services, respond to your inquiries, send service-related communications (with your consent), and comply with legal obligations.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">4. Third-Party Processors</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong className="text-text-primary">Google Gemini API:</strong> Processes real-time audio for the demo. Governed by Google's privacy policy.</li>
                        <li><strong className="text-text-primary">Cal.com:</strong> Manages meeting scheduling. Governed by Cal.com's privacy policy.</li>
                        <li><strong className="text-text-primary">Vercel:</strong> Hosts this website. Governed by Vercel's privacy policy.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">5. Your Rights (GDPR / CCPA)</h2>
                    <p>You have the right to access, correct, or delete your personal data. You may also withdraw consent at any time. To exercise your rights, email us at <a href="mailto:contact@reynubixvoice.com" className="text-brand-primary hover:underline">contact@reynubixvoice.com</a>.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">6. Data Retention</h2>
                    <p>We retain contact information only as long as necessary to provide our services or as required by law. Voice demo data is not retained after session closure.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">7. Cookies</h2>
                    <p>Our website may use functional cookies for theme preferences (light/dark mode, accent color). No third-party tracking cookies are used without your consent.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">8. Changes to This Policy</h2>
                    <p>We may update this policy periodically. We will notify users of material changes via email or a notice on our website.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">9. Contact Us</h2>
                    <p>For any privacy-related questions, contact us at <a href="mailto:contact@reynubixvoice.com" className="text-brand-primary hover:underline">contact@reynubixvoice.com</a>.</p>
                </div>

            </div>
        </div>
    </section>
);

export default Privacy;
