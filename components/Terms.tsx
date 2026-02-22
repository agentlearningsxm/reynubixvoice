import React from 'react';

const Terms: React.FC = () => (
    <section className="pt-40 pb-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <h1 className="text-4xl font-bold font-display text-text-primary mb-3">Terms of Service</h1>
            <p className="text-sm text-text-secondary mb-12">Last updated: February 2026</p>

            <div className="prose prose-lg max-w-none text-text-secondary space-y-8">

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
                    <p>By accessing or using ReynubixVoice ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">2. Description of Service</h2>
                    <p>ReynubixVoice provides AI-powered voice receptionist services that handle incoming calls, book appointments, and perform other front-desk functions on behalf of businesses. The interactive demo on our website is provided for evaluation purposes.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">3. Use of the Demo</h2>
                    <p>When using the interactive voice demo, you consent to your voice being processed in real time by our AI system (powered by Google Gemini). The demo is for evaluation purposes only and must not be used to transmit confidential, illegal, or harmful content.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">4. Intellectual Property</h2>
                    <p>All content on this website — including text, graphics, logos, and software — is the property of ReynubixVoice and protected by applicable intellectual property laws. You may not reproduce or redistribute any content without our prior written consent.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">5. Limitation of Liability</h2>
                    <p>To the maximum extent permitted by law, ReynubixVoice shall not be liable for any indirect, incidental, or consequential damages arising from your use of our Service. Our total liability shall not exceed the amount you paid for the Service in the three months preceding the claim.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">6. Prohibited Uses</h2>
                    <p>You agree not to use our Service to: engage in any unlawful activity, transmit spam or unauthorized communications, attempt to reverse-engineer or copy our AI systems, or impersonate any person or entity.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">7. Modifications to the Service</h2>
                    <p>We reserve the right to modify or discontinue the Service at any time, with or without notice. We shall not be liable to you or any third party for any such modification, suspension, or discontinuation.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">8. Governing Law</h2>
                    <p>These Terms shall be governed by and construed in accordance with the laws applicable in the jurisdiction where ReynubixVoice is registered, without regard to its conflict of law provisions.</p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-text-primary mb-3">9. Contact</h2>
                    <p>For any questions regarding these Terms, contact us at <a href="mailto:contact@reynubixvoice.com" className="text-brand-primary hover:underline">contact@reynubixvoice.com</a>.</p>
                </div>

            </div>
        </div>
    </section>
);

export default Terms;
