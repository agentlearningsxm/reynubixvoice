"use client";

import { CardStack, CardStackItem } from "@/components/ui/card-stack";
import { Link } from 'react-router-dom';

const referralCards: CardStackItem[] = [
    // CARD 1: Real Client - Hair to Dreads
    {
        id: 1,
        title: "Hair to Dreads",
        description: "Since 2010, Hair to Dreads has been Rotterdam's go-to for premium loc maintenance. Now with 24/7 AI reception, they never miss a booking.",
        imageSrc: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
        tag: "🏆 Founding Partner",
    },

    // CARD 2: Invitation
    {
        id: 2,
        title: "Your Success Story Starts Here",
        description: "Imagine never missing another opportunity. Every call answered. Every client captured. Your business deserves this.",
        imageSrc: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80",
        tag: "✨ Your Spot Awaits",
    },

    // CARD 3: Invitation
    {
        id: 3,
        title: "Ready to Join the Family?",
        description: "One conversation could change everything. Let us show you how 24/7 AI reception transforms your business—just like it did for Hair to Dreads.",
        imageSrc: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
        tag: "💡 Take the Leap",
    },

    // CARD 4: Invitation
    {
        id: 4,
        title: "Be the Next Success",
        description: "Every great partnership starts with one 'yes'. Your clients are calling—let's make sure you're always there to answer.",
        imageSrc: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
        tag: "🚀 Your Turn",
    },

    // CARD 5: Invitation
    {
        id: 5,
        title: "Write Your Chapter",
        description: "Hair to Dreads was our first. You could be next. Real results. Real referrals. Real partnership.",
        imageSrc: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&q=80",
        tag: "📖 Your Story",
    },

    // CARD 6: Direct CTA
    {
        id: 6,
        title: "Let's Make This Happen",
        description: "Book your demo today. See how we capture every missed call, every opportunity, every success. Join the family.",
        imageSrc: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
        tag: "💬 Book Now",
        href: "#contact",
        ctaLabel: "Start Your Journey",
    },
];

export default function ReferralSection()
{
    return (
        <section className="relative w-full bg-black py-24 overflow-hidden">
            {/* Background Gradient Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

            <div className="container relative z-10 mx-auto px-4">
                {/* Header */}
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl">
                        Join the <span className="text-cyan-400">Family</span>
                    </h2>

                    <p className="mx-auto max-w-2xl text-xl text-gray-300">
                        Every great partnership starts with one 'yes'. <br />
                        <span className="text-cyan-400 font-semibold">Will you be next?</span>
                    </p>
                </div>

                {/* CardStack Component — using Ruixen UI original API */}
                <div className="mx-auto w-full max-w-5xl">
                    <CardStack
                        items={referralCards}
                        initialIndex={0}
                        autoAdvance
                        intervalMs={2800}
                        pauseOnHover
                        showDots
                    />
                </div>

                {/* Bottom CTA */}
                <div className="mt-16 text-center">
                    <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-cyan-500/50"
                    >
                        Start Your Success Story
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}
