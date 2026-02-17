import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import
{
    Mail,
    Phone,
    MapPin,
    Send,
    User,
    MessageSquare,
    Building,
    ArrowRight,
    Sparkles,
    CheckCircle,
    Clock,
    Globe,
    Shield,
    Zap,
    Calendar
} from 'lucide-react';

const contactMethods = [
    {
        icon: Mail,
        title: "Email Us",
        description: "Get in touch via email",
        value: "voice@reynubix.com",
        link: "mailto:voice@reynubix.com",
        gradient: "from-blue-500/20 to-cyan-500/20",
        gradientLight: "from-blue-500/30 to-cyan-500/30",
        iconColor: "text-blue-500 dark:text-blue-400",
        hoverColor: "blue"
    },
    {
        icon: Phone,
        title: "WhatsApp Us",
        description: "Chat with us on WhatsApp",
        value: "+31 6 8536 7996",
        link: "https://wa.me/31685367996",
        gradient: "from-green-500/20 to-emerald-500/20",
        gradientLight: "from-green-500/30 to-emerald-500/30",
        iconColor: "text-green-500 dark:text-green-400",
        hoverColor: "green"
    },
    {
        icon: MapPin,
        title: "Visit Us",
        description: "Our headquarters",
        value: "Zuilenstein 2, 3334 CZ Zwijndrecht",
        link: "https://www.google.com/maps/search/?api=1&query=Zuilenstein+2,+3334+CZ+Zwijndrecht",
        gradient: "from-purple-500/20 to-pink-500/20",
        gradientLight: "from-purple-500/30 to-pink-500/30",
        iconColor: "text-purple-500 dark:text-purple-400",
        hoverColor: "purple"
    },
    {
        icon: Calendar,
        title: "Book an Appointment",
        description: "Schedule a time with us",
        value: "Coming Soon",
        link: "#", // No link yet
        gradient: "from-orange-500/20 to-red-500/20",
        gradientLight: "from-orange-500/30 to-red-500/30",
        iconColor: "text-orange-500 dark:text-orange-400",
        hoverColor: "orange"
    }
];

const companyStats = [
    { label: "Response Time", value: "< 2 hours", icon: Clock },
    { label: "Global Clients", value: "500+", icon: Globe },
    { label: "Security Level", value: "SOC 2", icon: Shield },
    { label: "Success Rate", value: "99.9%", icon: Zap }
];

export function PremiumContact()
{
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        message: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (field: string, value: string) =>
    {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field])
        {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () =>
    {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim())
        {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim())
        {
            newErrors.email = 'Email is required';
        } else if (!/\\S+@\\S+\\.\\S+/.test(formData.email))
        {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.message.trim())
        {
            newErrors.message = 'Message is required';
        } else if (formData.message.trim().length < 10)
        {
            newErrors.message = 'Message must be at least 10 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) =>
    {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try
        {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error('Failed to send');
            setIsSubmitted(true);
        } catch
        {
            setErrors({ message: 'Failed to send message. Please try emailing us directly at voice@reynubix.com' });
        } finally
        {
            setIsSubmitting(false);
        }
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 60 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: [0.23, 0.86, 0.39, 0.96]
            }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3
            }
        }
    };

    return (
        <section className="relative py-32 bg-bg-main text-text-primary transition-colors duration-500 overflow-hidden min-h-screen">
            {/* Enhanced Background Effects */}
            <div className="absolute inset-0">
                {/* Animated gradient mesh */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-brand-glow/5 to-brand-secondary/10"
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                    }}
                    transition={{
                        duration: 35,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{
                        backgroundSize: '400% 400%'
                    }}
                />

                {/* Refined AI Lighting - moving orbs */}
                <motion.div
                    className="absolute top-1/3 left-1/5 w-[500px] h-[500px] bg-brand-glow/15 rounded-full blur-[120px]"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] bg-brand-subtle/10 rounded-full blur-[100px]"
                    animate={{
                        x: [0, -80, 0],
                        y: [0, -40, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Upgraded Communication lines */}
                <div className="absolute inset-0 opacity-30">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-px h-[200px] bg-gradient-to-b from-transparent via-brand-primary/40 to-transparent"
                            style={{
                                left: `${15 + (i * 12)}%`,
                                top: `${20 + (i * 8)}%`,
                                transform: `rotate(${35 + i * 15}deg)`
                            }}
                            animate={{
                                opacity: [0.3, 0.7, 0.3],
                                scaleY: [1, 1.4, 1],
                            }}
                            transition={{
                                duration: 4 + i * 0.4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.3,
                            }}
                        />
                    ))}
                </div>
            </div>

            <motion.div
                ref={containerRef}
                className="relative z-10 max-w-7xl mx-auto px-6"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
            >
                {/* Header */}
                <motion.div
                    className="text-center mb-20"
                    variants={fadeInUp}
                >
                    <motion.div
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-brand-subtle dark:bg-brand-subtle bg-slate-100 border border-brand-primary/20 dark:border-brand-primary/20 border-slate-200 backdrop-blur-md mb-8 shadow-lg shadow-brand-glow/5 dark:shadow-brand-glow/5 shadow-slate-200/50"
                        whileHover={{ scale: 1.05, borderColor: "var(--accent-primary)" }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="h-4 w-4 text-brand-primary" />
                        </motion.div>
                        <span className="text-sm font-semibold tracking-wide uppercase text-text-primary/90">
                            Let's Connect
                        </span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    </motion.div>

                    <motion.h2
                        className="text-4xl sm:text-6xl md:text-8xl font-bold mb-8 tracking-tighter"
                        variants={fadeInUp}
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-text-primary via-text-primary to-text-primary/50">
                            Get in
                        </span>
                        <br />
                        <motion.span
                            className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary"
                            animate={{
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{
                                backgroundSize: '200% 200%'
                            }}
                        >
                            Touch
                        </motion.span>
                    </motion.h2>

                    <motion.p
                        className="text-xl sm:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed font-light"
                        variants={fadeInUp}
                    >
                        Ready to transform your business with AI? Let's start a conversation about your goals and how we can help you achieve them.
                    </motion.p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
                    variants={fadeInUp}
                >
                    {companyStats.map((stat, index) => (
                        <motion.div
                            key={index}
                            className="text-center p-8 bg-bg-card border border-border backdrop-blur-xl rounded-3xl group hover:border-brand-primary/30 hover:bg-brand-subtle transition-all shadow-lg shadow-black/5 dark:shadow-black/5 shadow-slate-200/50"
                            whileHover={{ scale: 1.05, y: -8 }}
                            variants={fadeInUp}
                        >
                            <motion.div
                                className="w-14 h-14 rounded-2xl bg-brand-subtle dark:bg-brand-subtle bg-slate-100 border border-brand-primary/20 dark:border-brand-primary/20 border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-inner shadow-slate-200/50 dark:shadow-none"
                                whileHover={{ rotateY: 180 }}
                                transition={{ duration: 0.6 }}
                            >
                                <stat.icon className="w-7 h-7 text-brand-primary" />
                            </motion.div>
                            <div className="text-3xl font-bold text-text-primary mb-1 tracking-tight">{stat.value}</div>
                            <div className="text-text-secondary text-sm font-medium uppercase tracking-wider">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <motion.div
                        className="space-y-8"
                        variants={fadeInUp}
                    >
                        <div>
                            <h3 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">Send us a message</h3>
                            <p className="text-text-secondary text-xl font-light">
                                Tell us about your project and we'll get back to you within 24 hours.
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {!isSubmitted ? (
                                <motion.form
                                    key="form"
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                    initial={{ opacity: 1 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary/50 group-focus-within:text-brand-primary transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Your Name"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className={`w-full pl-12 pr-4 py-4.5 bg-bg-card border rounded-2xl text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-glow/10 transition-all ${errors.name ? 'border-red-500/50' : 'border-border'
                                                    }`}
                                            />
                                            {errors.name && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-red-400 text-sm mt-2"
                                                >
                                                    {errors.name}
                                                </motion.p>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary/50 group-focus-within:text-brand-primary transition-colors" />
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className={`w-full pl-12 pr-4 py-4.5 bg-bg-card border rounded-2xl text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-glow/10 transition-all ${errors.email ? 'border-red-500/50' : 'border-border'
                                                    }`}
                                            />
                                            {errors.email && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-red-400 text-sm mt-2"
                                                >
                                                    {errors.email}
                                                </motion.p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary/50 group-focus-within:text-brand-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Company (Optional)"
                                            value={formData.company}
                                            onChange={(e) => handleInputChange('company', e.target.value)}
                                            className="w-full pl-12 pr-4 py-4.5 bg-bg-card border border-border rounded-2xl text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-glow/10 transition-all"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <MessageSquare className="absolute left-4 top-5 h-5 w-5 text-text-secondary/50 group-focus-within:text-brand-primary transition-colors" />
                                        <textarea
                                            placeholder="Tell us about your project..."
                                            rows={6}
                                            value={formData.message}
                                            onChange={(e) => handleInputChange('message', e.target.value)}
                                            className={`w-full pl-12 pr-4 py-4.5 bg-bg-card border rounded-2xl text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-glow/10 transition-all resize-none ${errors.message ? 'border-red-500/50' : 'border-border'
                                                }`}
                                        />
                                        {errors.message && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-red-400 text-sm mt-2"
                                            >
                                                {errors.message}
                                            </motion.p>
                                        )}
                                    </div>

                                    <motion.button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full relative group overflow-hidden bg-brand-primary hover:bg-brand-secondary text-white font-bold py-5 px-8 rounded-2xl transition-all shadow-xl shadow-brand-glow/20 disabled:opacity-50"
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                                            initial={{ x: "-100%" }}
                                            whileHover={{ x: "100%" }}
                                            transition={{ duration: 0.6 }}
                                        />
                                        <span className="relative flex items-center justify-center gap-3 text-lg uppercase tracking-widest">
                                            {isSubmitting ? (
                                                <motion.div
                                                    className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                />
                                            ) : (
                                                <>
                                                    <Send className="h-5 w-5" />
                                                    Send Message
                                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </motion.button>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-12"
                                >
                                    <motion.div
                                        className="w-20 h-20 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center mx-auto mb-6"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    >
                                        <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-text-primary mb-4">Message Sent!</h3>
                                    <p className="text-text-secondary text-lg mb-6">
                                        Thank you for reaching out. We'll get back to you within 24 hours.
                                    </p>
                                    <motion.button
                                        onClick={() =>
                                        {
                                            setIsSubmitted(false);
                                            setFormData({ name: '', email: '', company: '', message: '' });
                                        }}
                                        className="px-6 py-3 bg-bg-card border border-border rounded-xl text-text-primary hover:bg-brand-subtle transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Send Another Message
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Google Maps Embed */}
                        <motion.div
                            className="mt-12 p-1.5 bg-bg-card border border-border backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl group ring-1 ring-brand-primary/10 dark:ring-brand-primary/10 ring-slate-200"
                            variants={fadeInUp}
                            whileHover={{ scale: 1.01, borderColor: "var(--accent-primary)" }}
                        >
                            <div className="relative w-full h-[300px] sm:h-[400px]">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2464.2483569804!2d4.607490077383187!3d51.8213233871936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c42f0a1ea33a41%3A0xe99f0f9c2c8f8b7b!2sZuilenstein%202%2C%203334%20CZ%20Zwijndrecht!5e0!3m2!1sen!2snl!4v1708080000000!5m2!1sen!2snl"
                                    className="absolute inset-0 w-full h-full border-0 grayscale hover:grayscale-0 dark:invert-[0.9] dark:hover:invert-0 transition-all duration-1000 opacity-90 group-hover:opacity-100"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Contact Methods */}
                    <motion.div
                        className="space-y-8"
                        variants={fadeInUp}
                    >
                        <div>
                            <h3 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">Other ways to reach us</h3>
                            <p className="text-text-secondary text-xl font-light">
                                Choose the method that works best for you.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {contactMethods.map((method, index) => (
                                <motion.a
                                    key={index}
                                    href={method.link}
                                    className="block p-8 bg-bg-card border border-border backdrop-blur-2xl rounded-3xl hover:bg-brand-subtle hover:border-brand-primary/30 shadow-lg shadow-black/5 dark:shadow-black/5 shadow-slate-200/50 transition-all group"
                                    variants={fadeInUp}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                >
                                    <div className="flex items-center gap-6">
                                        <motion.div
                                            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.gradientLight} dark:${method.gradient} border border-slate-200 dark:border-brand-primary/10 flex items-center justify-center shadow-inner shadow-slate-200/50 dark:shadow-none`}
                                            whileHover={{ scale: 1.1, rotateY: 180 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            <method.icon className={`w-8 h-8 ${method.iconColor}`} />
                                        </motion.div>
                                        <div className="flex-1">
                                            <h4 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{method.title}</h4>
                                            <p className="text-text-secondary text-base font-light mb-2">{method.description}</p>
                                            <p className="text-lg font-semibold text-text-primary group-hover:text-brand-primary transition-colors">{method.value}</p>
                                        </div>
                                        <ArrowRight className="w-6 h-6 text-slate-300 dark:text-text-secondary/30 group-hover:text-brand-primary group-hover:translate-x-2 transition-all" />
                                    </div>
                                </motion.a>
                            ))}
                        </div>

                        {/* Additional Info */}
                        <motion.div
                            className="p-8 bg-brand-subtle dark:bg-brand-subtle bg-slate-100 border border-brand-primary/20 dark:border-brand-primary/20 border-slate-200 backdrop-blur-2xl rounded-3xl shadow-xl shadow-brand-glow/5 dark:shadow-brand-glow/5 shadow-slate-200/50"
                            variants={fadeInUp}
                        >
                            <h4 className="text-xl font-bold text-text-primary mb-4 tracking-tight flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-brand-primary" />
                                Quick Response Guarantee
                            </h4>
                            <p className="text-text-secondary text-base leading-relaxed font-light">
                                We pride ourselves on rapid response times. All inquiries are typically answered within 2 hours during business hours,
                                and we'll schedule a call within 24 hours to discuss your project in detail.
                            </p>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating Elements */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-slate-300/40 dark:bg-white/20 rounded-full"
                        style={{
                            left: `${10 + (i * 12)}%`,
                            top: `${20 + (i * 10)}%`,
                        }}
                        animate={{
                            y: [0, -40, 0],
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 2, 1],
                        }}
                        transition={{
                            duration: 4 + i * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.6,
                        }}
                    />
                ))}
            </motion.div>
        </section>
    );
}
