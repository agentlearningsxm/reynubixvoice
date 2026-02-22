import { Plus, Trash2, User, Phone, Mail, Globe, MapPin, Share2, Bot } from 'lucide-react';
import { VCardData, PhoneEntry, EmailEntry } from '@/lib/vcard';
import { motion, AnimatePresence } from 'framer-motion';

interface VCardFormProps {
  data: VCardData;
  onChange: (data: VCardData) => void;
}

const phoneTypes: PhoneEntry['type'][] = ['CELL', 'WORK', 'HOME', 'FAX'];
const emailTypes: EmailEntry['type'][] = ['PERSONAL', 'WORK', 'OTHER'];

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon size={14} className="text-rasta-green" />
        {title}
      </div>
      {children}
    </div>
  );
}

export default function VCardForm({ data, onChange }: VCardFormProps) {
  const update = <K extends keyof VCardData>(key: K, value: VCardData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const addPhone = () => update('phones', [...data.phones, { type: 'CELL', value: '' }]);
  const removePhone = (i: number) => update('phones', data.phones.filter((_, idx) => idx !== i));
  const updatePhone = (i: number, field: keyof PhoneEntry, val: string) => {
    const phones = [...data.phones];
    phones[i] = { ...phones[i], [field]: val };
    update('phones', phones);
  };

  const addEmail = () => update('emails', [...data.emails, { type: 'WORK', value: '' }]);
  const removeEmail = (i: number) => update('emails', data.emails.filter((_, idx) => idx !== i));
  const updateEmail = (i: number, field: keyof EmailEntry, val: string) => {
    const emails = [...data.emails];
    emails[i] = { ...emails[i], [field]: val };
    update('emails', emails);
  };

  const addWebsite = () => update('websites', [...data.websites, '']);
  const removeWebsite = (i: number) => update('websites', data.websites.filter((_, idx) => idx !== i));
  const updateWebsite = (i: number, val: string) => {
    const websites = [...data.websites];
    websites[i] = val;
    update('websites', websites);
  };

  return (
    <div className="space-y-6 pr-2 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
      {/* Personal Info */}
      <Section icon={User} title="Personal Info">
        <div className="grid grid-cols-2 gap-3">
          <input className="glass-input" placeholder="First Name *" value={data.firstName} onChange={e => update('firstName', e.target.value)} />
          <input className="glass-input" placeholder="Last Name *" value={data.lastName} onChange={e => update('lastName', e.target.value)} />
        </div>
        <input className="glass-input w-full" placeholder="Organization / Company" value={data.organization} onChange={e => update('organization', e.target.value)} />
        <input className="glass-input w-full" placeholder="Job Title" value={data.jobTitle} onChange={e => update('jobTitle', e.target.value)} />
      </Section>

      {/* Phone Numbers */}
      <Section icon={Phone} title="Phone Numbers">
        <AnimatePresence>
          {data.phones.map((phone, i) => (
            <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 items-center">
              <select className="glass-input w-28 shrink-0" value={phone.type} onChange={e => updatePhone(i, 'type', e.target.value)}>
                {phoneTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="glass-input flex-1" placeholder="+1 (555) 000-0000" value={phone.value} onChange={e => updatePhone(i, 'value', e.target.value)} />
              {data.phones.length > 1 && (
                <button onClick={() => removePhone(i)} className="p-2 text-muted-foreground hover:text-accent transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={addPhone} className="flex items-center gap-1.5 text-xs text-rasta-green hover:text-rasta-gold transition-colors font-medium">
          <Plus size={14} /> Add Phone
        </button>
      </Section>

      {/* Emails */}
      <Section icon={Mail} title="Email Addresses">
        <AnimatePresence>
          {data.emails.map((email, i) => (
            <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 items-center">
              <select className="glass-input w-28 shrink-0" value={email.type} onChange={e => updateEmail(i, 'type', e.target.value)}>
                {emailTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="glass-input flex-1" placeholder="email@example.com" value={email.value} onChange={e => updateEmail(i, 'value', e.target.value)} />
              {data.emails.length > 1 && (
                <button onClick={() => removeEmail(i)} className="p-2 text-muted-foreground hover:text-accent transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={addEmail} className="flex items-center gap-1.5 text-xs text-rasta-green hover:text-rasta-gold transition-colors font-medium">
          <Plus size={14} /> Add Email
        </button>
      </Section>

      {/* Websites */}
      <Section icon={Globe} title="Websites">
        <AnimatePresence>
          {data.websites.map((url, i) => (
            <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 items-center">
              <input className="glass-input flex-1" placeholder="https://yoursite.com" value={url} onChange={e => updateWebsite(i, e.target.value)} />
              {data.websites.length > 1 && (
                <button onClick={() => removeWebsite(i)} className="p-2 text-muted-foreground hover:text-accent transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={addWebsite} className="flex items-center gap-1.5 text-xs text-rasta-green hover:text-rasta-gold transition-colors font-medium">
          <Plus size={14} /> Add Website
        </button>
      </Section>

      {/* Address */}
      <Section icon={MapPin} title="Address">
        <input className="glass-input w-full" placeholder="Street" value={data.street} onChange={e => update('street', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="glass-input" placeholder="City" value={data.city} onChange={e => update('city', e.target.value)} />
          <input className="glass-input" placeholder="State" value={data.state} onChange={e => update('state', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className="glass-input" placeholder="Zipcode" value={data.zipcode} onChange={e => update('zipcode', e.target.value)} />
          <input className="glass-input" placeholder="Country" value={data.country} onChange={e => update('country', e.target.value)} />
        </div>
      </Section>

      {/* Social Links */}
      <Section icon={Share2} title="Social Links">
        <input className="glass-input w-full" placeholder="LinkedIn URL" value={data.linkedin} onChange={e => update('linkedin', e.target.value)} />
        <input className="glass-input w-full" placeholder="Instagram URL" value={data.instagram} onChange={e => update('instagram', e.target.value)} />
        <input className="glass-input w-full" placeholder="Twitter / X URL" value={data.twitter} onChange={e => update('twitter', e.target.value)} />
        <input className="glass-input w-full" placeholder="TikTok URL" value={data.tiktok} onChange={e => update('tiktok', e.target.value)} />
      </Section>

      {/* Voice AI */}
      <Section icon={Bot} title="Voice AI Agent">
        <input className="glass-input w-full" placeholder="AI Agent Demo URL" value={data.voiceAgentUrl} onChange={e => update('voiceAgentUrl', e.target.value)} />
        <textarea className="glass-input w-full resize-none h-20" placeholder="Note or tagline (e.g. AI Receptionist Available 24/7)" value={data.note} onChange={e => update('note', e.target.value)} />
      </Section>
    </div>
  );
}
