import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Shield,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  persistLeadId,
  postJsonWithContext,
  trackEventFireAndForget,
} from '../../lib/telemetry/browser';
import { RadiusMap } from './radius-map';

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Get in touch via email',
    value: 'voice@reynubix.com',
    link: 'mailto:voice@reynubix.com',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    gradientLight: 'from-amber-100 to-yellow-100',
    iconColor: 'text-amber-700 dark:text-amber-400',
    hoverColorRgb: '200, 169, 96',
    comingSoon: false,
  },
  {
    icon: Phone,
    title: 'WhatsApp Us',
    description: 'Chat with us on WhatsApp',
    value: '+31 6 8536 7996',
    link: 'https://wa.me/31685367996',
    gradient: 'from-green-500/20 to-emerald-500/20',
    gradientLight: 'from-green-100 to-emerald-100',
    iconColor: 'text-green-700 dark:text-green-400',
    hoverColorRgb: '34, 197, 94',
    comingSoon: false,
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    description: 'Our headquarters',
    value: 'Zwijndrecht, Netherlands',
    link: 'https://www.google.com/maps/search/?api=1&query=Zwijndrecht,+Netherlands',
    gradient: 'from-amber-600/20 to-yellow-600/20',
    gradientLight: 'from-amber-100 to-yellow-100',
    iconColor: 'text-amber-700 dark:text-amber-500',
    hoverColorRgb: '200, 169, 96',
    comingSoon: false,
  },
  {
    icon: Calendar,
    title: 'Book an Appointment',
    description: 'Schedule a time with us',
    value: 'Pick a time that works for you',
    link: 'https://cal.com/reynubix-voice/let-s-talk',
    gradient: 'from-orange-500/20 to-red-500/20',
    gradientLight: 'from-orange-100 to-red-100',
    iconColor: 'text-orange-700 dark:text-orange-400',
    hoverColorRgb: '249, 115, 22',
    comingSoon: false,
  },
];

const companyStats = [
  { label: 'Response Time', value: '< 2 hours', icon: Clock },
  { label: 'Global Clients', value: '500+', icon: Globe },
  { label: 'Security Level', value: 'SOC 2', icon: Shield },
  { label: 'Success Rate', value: '99.9%', icon: Zap },
];

const panelClassName =
  'rounded-[28px] border border-border-subtle bg-surface-raised/92 shadow-[0_22px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl';
const fieldClassName =
  'w-full rounded-2xl border border-border-subtle bg-surface/92 py-4.5 pl-12 pr-4 text-text-primary placeholder:text-text-muted-strong/80 transition-all focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-glow/12';
const fieldLabelClassName =
  'mb-2 block text-sm font-semibold text-text-muted-strong';
const primaryActionStyle = {
  background:
    'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
  boxShadow:
    '0 14px 30px color-mix(in srgb, var(--accent-primary) 22%, transparent), 0 6px 20px rgba(0,0,0,0.18)',
} as const;
const contactLineDecor = Array.from({ length: 8 }, (_, i) => ({
  id: `contact-line-${15 + i * 12}-${20 + i * 8}`,
  left: `${15 + i * 12}%`,
  top: `${20 + i * 8}%`,
  rotation: `${35 + i * 15}deg`,
  duration: 4 + i * 0.4,
  delay: i * 0.3,
}));
const floatingDecor = Array.from({ length: 5 }, (_, i) => ({
  id: `contact-float-${10 + i * 12}-${20 + i * 10}`,
  left: `${10 + i * 12}%`,
  top: `${20 + i * 10}%`,
  duration: 4 + i * 0.5,
  delay: i * 0.6,
}));

export function PremiumContact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    trackEventFireAndForget('contact_form_viewed', {
      route: '/contact',
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    trackEventFireAndForget('contact_form_submit_attempt', {
      phoneProvided: Boolean(formData.phone.trim()),
      companyProvided: Boolean(formData.company.trim()),
      messageLength: formData.message.trim().length,
    });
    try {
      const res = await postJsonWithContext<{
        success: boolean;
        leadId?: string;
      }>('/api/contact', formData);
      persistLeadId(res.leadId);
      trackEventFireAndForget('contact_form_submit_success', {
        leadId: res.leadId ?? null,
      });
      setIsSubmitted(true);
    } catch {
      trackEventFireAndForget('contact_form_submit_error');
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setErrors({
        message: isLocal
          ? "Contact form requires 'npm run dev:api' for local testing. In production, this works automatically."
          : 'Failed to send message. Please try emailing us directly at voice@reynubix.com',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeInUp: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.23, 0.86, 0.39, 0.96] as [number, number, number, number],
      },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  return (
    <section
      id="contact"
      className="relative py-16 md:py-32 bg-bg-main text-text-primary transition-colors duration-500 overflow-hidden min-h-screen"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Animated gradient mesh */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-primary/8 via-brand-glow/4 to-brand-secondary/8"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '400% 400%',
          }}
        />

        {/* Refined AI Lighting - moving orbs */}
        <motion.div
          className="absolute top-1/3 left-1/5 h-[500px] w-[500px] rounded-full bg-brand-glow/10 blur-[120px]"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/5 h-[400px] w-[400px] rounded-full bg-brand-subtle/8 blur-[100px]"
          animate={{
            x: [0, -80, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Upgraded Communication lines */}
        <div className="absolute inset-0 opacity-18">
          {contactLineDecor.map((line) => (
            <motion.div
              key={line.id}
              className="absolute w-px h-[200px] bg-gradient-to-b from-transparent via-brand-primary/40 to-transparent"
              style={{
                left: line.left,
                top: line.top,
                transform: `rotate(${line.rotation})`,
              }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
                scaleY: [1, 1.4, 1],
              }}
              transition={{
                duration: line.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: line.delay,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        className="relative z-10 page-container"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        {/* Header */}
        <motion.div className="text-center mb-10 md:mb-20" variants={fadeInUp}>
          <motion.div
            className="glass-card mb-8 inline-flex items-center gap-3 rounded-full bg-bg-glass/85 px-5 py-2.5 text-text-primary"
            whileHover={{ scale: 1.02, borderColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-semibold tracking-wide uppercase text-text-primary">
              Let's Connect
            </span>
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.35)]" />
          </motion.div>

          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-8 tracking-tighter"
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
                ease: 'easeInOut',
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            >
              Touch
            </motion.span>
          </motion.h2>

          <motion.p
            className="mx-auto max-w-4xl text-lg leading-relaxed text-text-muted-strong sm:text-2xl"
            variants={fadeInUp}
          >
            Ready to transform your business with AI? Let's start a conversation
            about your goals and how we can help you achieve them.
          </motion.p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 md:mb-20"
          variants={fadeInUp}
        >
          {companyStats.map((stat) => (
            <motion.div
              key={stat.label}
              className={`${panelClassName} group p-4 text-center transition-all hover:border-brand-primary/30 hover:bg-brand-subtle/55 sm:p-8`}
              whileHover={{ scale: 1.02, y: -4 }}
              variants={fadeInUp}
            >
              <motion.div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-primary/20 bg-brand-subtle/80"
                whileHover={{ rotateY: 180 }}
                transition={{ duration: 0.6 }}
              >
                <stat.icon className="w-7 h-7 text-brand-primary" />
              </motion.div>
              <div className="text-3xl font-bold text-text-primary mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm font-medium uppercase tracking-wider text-text-muted-strong">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div className="space-y-8" variants={fadeInUp}>
            <div>
              <h3 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">
                Send us a message
              </h3>
              <p className="text-xl text-text-muted-strong">
                Tell us about your project and we'll get back to you within 24
                hours.
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
                    <div className="group">
                      <label
                        htmlFor="contact-name"
                        className={fieldLabelClassName}
                      >
                        Your Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted-strong/75 transition-colors group-focus-within:text-brand-primary" />
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Your Name"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange('name', e.target.value)
                          }
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={
                            errors.name ? 'contact-name-error' : undefined
                          }
                          className={`${fieldClassName} ${
                            errors.name ? 'border-red-500/50' : ''
                          }`}
                        />
                      </div>
                      {errors.name && (
                        <motion.p
                          id="contact-name-error"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-sm mt-2"
                        >
                          {errors.name}
                        </motion.p>
                      )}
                    </div>

                    <div className="group">
                      <label
                        htmlFor="contact-email"
                        className={fieldLabelClassName}
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted-strong/75 transition-colors group-focus-within:text-brand-primary" />
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="Email Address"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange('email', e.target.value)
                          }
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={
                            errors.email ? 'contact-email-error' : undefined
                          }
                          className={`${fieldClassName} ${
                            errors.email ? 'border-red-500/50' : ''
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          id="contact-email-error"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-sm mt-2"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label
                        htmlFor="contact-phone"
                        className={fieldLabelClassName}
                      >
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted-strong/75 transition-colors group-focus-within:text-brand-primary" />
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="Phone Number"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange('phone', e.target.value)
                          }
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={
                            errors.phone ? 'contact-phone-error' : undefined
                          }
                          className={`${fieldClassName} ${
                            errors.phone ? 'border-red-500/50' : ''
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <motion.p
                          id="contact-phone-error"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-sm mt-2"
                        >
                          {errors.phone}
                        </motion.p>
                      )}
                    </div>

                    <div className="group">
                      <label
                        htmlFor="contact-company"
                        className={fieldLabelClassName}
                      >
                        Company
                      </label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted-strong/75 transition-colors group-focus-within:text-brand-primary" />
                        <input
                          id="contact-company"
                          name="company"
                          type="text"
                          autoComplete="organization"
                          placeholder="Company (Optional)"
                          value={formData.company}
                          onChange={(e) =>
                            handleInputChange('company', e.target.value)
                          }
                          className={fieldClassName}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label
                      htmlFor="contact-message"
                      className={fieldLabelClassName}
                    >
                      Project Details
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-5 h-5 w-5 text-text-muted-strong/75 transition-colors group-focus-within:text-brand-primary" />
                      <textarea
                        id="contact-message"
                        name="message"
                        placeholder="Tell us about your project..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) =>
                          handleInputChange('message', e.target.value)
                        }
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={
                          errors.message ? 'contact-message-error' : undefined
                        }
                        className={`${fieldClassName} resize-none ${
                          errors.message ? 'border-red-500/50' : ''
                        }`}
                      />
                    </div>
                    {errors.message && (
                      <motion.p
                        id="contact-message-error"
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
                    className="group relative w-full overflow-hidden rounded-full border border-brand-primary/25 px-8 py-5 font-semibold text-accent-ink transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
                    style={primaryActionStyle}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <span className="relative flex items-center justify-center gap-3 text-lg uppercase tracking-widest">
                      {isSubmitting ? (
                        <motion.div
                          className="h-6 w-6 rounded-full border-3 border-accent-ink/25 border-t-accent-ink"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
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
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-text-primary mb-4">
                    Message Sent!
                  </h3>
                  <p className="text-text-muted-strong text-lg mb-6">
                    Thank you for reaching out. We'll get back to you within 24
                    hours.
                  </p>
                  <motion.button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        company: '',
                        message: '',
                      });
                    }}
                    className="px-6 py-3 bg-bg-card border border-border rounded-xl text-text-primary hover:bg-brand-subtle transition-all"
                    type="button"
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
              className={`group mt-12 overflow-hidden p-1.5 ring-1 ring-brand-primary/10 ${panelClassName}`}
              variants={fadeInUp}
              whileHover={{ scale: 1.01, borderColor: 'var(--accent-primary)' }}
            >
              <div className="relative w-full h-[300px] sm:h-[400px]">
                <RadiusMap />
              </div>
            </motion.div>
          </motion.div>

          {/* Contact Methods */}
          <motion.div className="space-y-8" variants={fadeInUp}>
            <div>
              <h3 className="text-4xl font-bold text-text-primary mb-4 tracking-tight">
                Other ways to reach us
              </h3>
              <p className="text-xl text-text-muted-strong">
                Choose the method that works best for you.
              </p>
            </div>

            <div className="space-y-6">
              {contactMethods.map((method) => {
                if (method.comingSoon) {
                  return (
                    <motion.div
                      key={method.title}
                      className={`${panelClassName} relative block cursor-not-allowed p-5 opacity-70 sm:p-8`}
                      variants={fadeInUp}
                    >
                      <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        Coming Soon
                      </div>
                      <div className="flex items-center gap-6">
                        <div
                          className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-primary/12 bg-gradient-to-br ${method.gradientLight} dark:${method.gradient}`}
                        >
                          <method.icon
                            className={`w-8 h-8 ${method.iconColor}`}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">
                            {method.title}
                          </h4>
                          <p className="mb-2 text-base text-text-muted-strong">
                            {method.description}
                          </p>
                          <p className="text-lg font-semibold text-text-muted-strong">
                            {method.value}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return (
                  <motion.a
                    key={method.title}
                    href={method.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackEventFireAndForget('contact_method_clicked', {
                        method: method.title,
                        href: method.link,
                      })
                    }
                    className={`${panelClassName} group relative block p-5 transition-all hover:border-brand-primary/30 hover:bg-brand-subtle/55 sm:p-8`}
                    variants={fadeInUp}
                    whileHover={{
                      scale: 1.01,
                      y: -4,
                      boxShadow: `0 10px 30px rgba(${method.hoverColorRgb}, 0.16), 0 4px 12px rgba(${method.hoverColorRgb}, 0.08)`,
                    }}
                  >
                    <div className="flex items-center gap-6">
                      <motion.div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-primary/12 bg-gradient-to-br ${method.gradientLight} dark:${method.gradient}`}
                        whileHover={{ scale: 1.1, rotateY: 180 }}
                        transition={{ duration: 0.6 }}
                      >
                        <method.icon
                          className={`w-8 h-8 ${method.iconColor}`}
                        />
                      </motion.div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">
                          {method.title}
                        </h4>
                        <p className="mb-2 text-base text-text-muted-strong">
                          {method.description}
                        </p>
                        <p className="text-lg font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                          {method.value}
                        </p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-text-muted-strong/65 transition-all group-hover:translate-x-2 group-hover:text-brand-primary" />
                    </div>
                  </motion.a>
                );
              })}
            </div>

            {/* Additional Info */}
            <motion.div className={`${panelClassName} p-8`} variants={fadeInUp}>
              <h4 className="text-xl font-bold text-text-primary mb-4 tracking-tight flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-brand-primary" />
                Quick Response Guarantee
              </h4>
              <p className="text-base leading-relaxed text-text-muted-strong">
                We pride ourselves on rapid response times. All inquiries are
                typically answered within 2 hours during business hours, and
                we'll schedule a call within 24 hours to discuss your project in
                detail.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        {floatingDecor.map((dot) => (
          <motion.div
            key={dot.id}
            className="absolute h-2 w-2 rounded-full bg-slate-300/30 dark:bg-white/14"
            style={{
              left: dot.left,
              top: dot.top,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 2, 1],
            }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: dot.delay,
            }}
          />
        ))}
      </motion.div>
    </section>
  );
}
