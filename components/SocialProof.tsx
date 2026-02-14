import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

const SocialProof: React.FC = () => {
  const { t } = useLanguage();

  const testimonials = [
    {
      ...t.social.testimonials[0],
      image: "https://picsum.photos/100/100?random=10",
      author: "Mike R."
    },
    {
      ...t.social.testimonials[1],
      image: "https://picsum.photos/100/100?random=11",
      author: "Sarah L."
    },
    {
      ...t.social.testimonials[2],
      image: "https://picsum.photos/100/100?random=12",
      author: "David K."
    }
  ];

  return (
    <section className="py-24 relative" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <p className="text-brand-primary font-medium mb-2 uppercase">{t.social.trusted}</p>
          <div className="flex justify-center gap-8 opacity-50 grayscale mb-12">
            {/* Mock Logos - In light mode, these might need invert if they are images, but they are text here */}
            {['Stripe', 'Tuple', 'Acme', 'Mirage', 'Laravel'].map((logo, i) => (
               <span key={i} className="text-xl font-bold font-display text-text-secondary">{logo}</span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass-card p-8 rounded-2xl border border-border relative"
            >
              <div className="flex gap-1 mb-4 text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-text-secondary italic mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center gap-4">
                <img src={testimonial.image} alt={testimonial.author} className="w-12 h-12 rounded-full border-2 border-brand-primary/50" />
                <div>
                  <h4 className="text-text-primary font-semibold">{testimonial.author}</h4>
                  <p className="text-text-secondary text-sm">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default SocialProof;