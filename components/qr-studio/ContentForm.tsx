import React from 'react';
import { useQRStore } from '../../store/qrStore';
import { Link2, Contact, Type } from 'lucide-react';

function InputField({
  label,
  value,
  type = 'text',
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-secondary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary transition-colors"
      />
    </div>
  );
}

export default function ContentForm()
{
  const { qrType, setQRType, url, setUrl, vcardData, updateVCard } = useQRStore();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Data Type</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['url', 'vcard', 'text'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setQRType(type)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${qrType === type
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-border bg-bg-card hover:border-brand-primary/50 text-text-secondary'
                }`}
            >
              {type === 'url' && <Link2 size={20} className="mb-1" />}
              {type === 'vcard' && <Contact size={20} className="mb-1" />}
              {type === 'text' && <Type size={20} className="mb-1" />}
              <span className="text-xs font-medium capitalize">{type === 'vcard' ? 'Contact+' : type}</span>
            </button>
          ))}
        </div>
      </div>

      {qrType === 'url' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <label className="block text-sm font-medium text-text-primary">URL Destination</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>
      )}

      {qrType === 'vcard' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs text-text-secondary">Add full contact + social profile details in one QR.</p>

          <div className="grid grid-cols-2 gap-3">
            <InputField label="First Name" value={vcardData.firstName} onChange={(value) => updateVCard({ firstName: value })} />
            <InputField label="Last Name" value={vcardData.lastName} onChange={(value) => updateVCard({ lastName: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField label="Phone Number" type="tel" value={vcardData.phone} onChange={(value) => updateVCard({ phone: value })} />
            <InputField label="Email Address" type="email" value={vcardData.email} onChange={(value) => updateVCard({ email: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField label="Company" value={vcardData.company} onChange={(value) => updateVCard({ company: value })} />
            <InputField label="Job Title" value={vcardData.title} onChange={(value) => updateVCard({ title: value })} />
          </div>

          <InputField
            label="Website"
            type="url"
            value={vcardData.website}
            placeholder="https://yourwebsite.com"
            onChange={(value) => updateVCard({ website: value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField label="LinkedIn" type="url" value={vcardData.linkedin} onChange={(value) => updateVCard({ linkedin: value })} />
            <InputField label="Instagram" type="url" value={vcardData.instagram} onChange={(value) => updateVCard({ instagram: value })} />
            <InputField label="Twitter / X" type="url" value={vcardData.twitter} onChange={(value) => updateVCard({ twitter: value })} />
            <InputField label="TikTok" type="url" value={vcardData.tiktok} onChange={(value) => updateVCard({ tiktok: value })} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary">Address</label>
            <input
              type="text"
              value={vcardData.address}
              onChange={(e) => updateVCard({ address: e.target.value })}
              placeholder="Street, City, State, ZIP, Country"
              className="w-full px-3 py-2 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary">Note</label>
            <textarea
              value={vcardData.note}
              onChange={(e) => updateVCard({ note: e.target.value })}
              placeholder="Optional note/tagline"
              rows={3}
              className="w-full px-3 py-2 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none"
            />
          </div>
        </div>
      )}

      {qrType === 'text' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <label className="block text-sm font-medium text-text-primary">Text Content</label>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter any text here..."
            rows={4}
            className="w-full px-3 py-2 bg-black/20 border border-border rounded-md text-sm focus:outline-none focus:border-brand-primary transition-colors resize-none custom-scrollbar"
          />
        </div>
      )}
    </div>
  );
}
