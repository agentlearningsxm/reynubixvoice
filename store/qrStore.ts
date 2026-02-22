import { create } from 'zustand';
import { saveDraft, loadDraft } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { QRGradient, QRLogo, QRMask, QRRenderMode, QRScanGuardState } from '../lib/qr/engine/types';

type QRShape = 'square' | 'circle' | 'heart' | 'star' | 'shield';
type QRDotsType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
type QRCornerSquareType = 'dot' | 'square' | 'extra-rounded';

export interface QRStyleState {
    shape: QRShape;
    renderMode: QRRenderMode;
    qrSize: number;
    dotsType: QRDotsType;
    dotsColor: string;
    backgroundColor: string;
    cornerSquareType: QRCornerSquareType;
    cornerSquareColor: string;
    quietZone: number;
    gradient?: QRGradient;
    logo: QRLogo;
    mask: QRMask;
    scanGuard: QRScanGuardState;
}

const DEFAULT_QR_STYLE: QRStyleState = {
    shape: 'square',
    renderMode: 'safe',
    qrSize: 320,
    dotsType: 'rounded',
    dotsColor: '#0EA5E9',
    backgroundColor: 'transparent',
    cornerSquareType: 'extra-rounded',
    cornerSquareColor: '#0EA5E9',
    quietZone: 4,
    logo: {
        enabled: false,
        imageDataUrl: null,
        sizeRatio: 0.2,
        margin: 8,
    },
    mask: {
        enabled: false,
        svgPath: null,
        name: null,
    },
    scanGuard: {
        enabled: true,
        score: 100,
        pass: true,
        warnings: [],
    },
};

const DEFAULT_VCARD = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    title: '',
    website: '',
    linkedin: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    address: '',
    note: '',
};

function normalizeQrStyle(input?: Partial<QRStyleState> | null): QRStyleState {
    const style = input ?? {};
    return {
        ...DEFAULT_QR_STYLE,
        ...style,
        qrSize: style.qrSize ?? DEFAULT_QR_STYLE.qrSize,
        quietZone: style.quietZone ?? DEFAULT_QR_STYLE.quietZone,
        logo: {
            ...DEFAULT_QR_STYLE.logo,
            ...(style.logo ?? {}),
        },
        mask: {
            ...DEFAULT_QR_STYLE.mask,
            ...(style.mask ?? {}),
        },
        scanGuard: {
            ...DEFAULT_QR_STYLE.scanGuard,
            ...(style.scanGuard ?? {}),
        },
        gradient: style.gradient
            ? {
                enabled: style.gradient.enabled ?? false,
                type: style.gradient.type ?? 'linear',
                colorStops: Array.isArray(style.gradient.colorStops) ? style.gradient.colorStops : [],
            }
            : undefined,
    };
}

export interface QRState
{
    // Content
    url: string;
    qrType: 'url' | 'vcard' | 'text';
    vcardData: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        company: string;
        title: string;
        website: string;
        linkedin: string;
        instagram: string;
        twitter: string;
        tiktok: string;
        address: string;
        note: string;
    };

    // Styles
    theme: 'light' | 'dark' | 'brand';
    qrStyle: {
        shape: QRShape;
        renderMode: QRRenderMode;
        qrSize: number;
        dotsType: QRDotsType;
        dotsColor: string;
        backgroundColor: string;
        cornerSquareType: QRCornerSquareType;
        cornerSquareColor: string;
        quietZone: number;
        gradient?: QRGradient;
        logo: QRLogo;
        mask: QRMask;
        scanGuard: QRScanGuardState;
    };

    // Actions
    isMobilePreview: boolean;
    toggleMobilePreview: () => void;
    setUrl: (url: string) => void;
    setQRType: (type: 'url' | 'vcard' | 'text') => void;
    updateVCard: (data: Partial<QRState['vcardData']>) => void;
    setTheme: (theme: QRState['theme']) => void;
    updateQRStyle: (style: Partial<QRState['qrStyle']>) => void;
    setScanGuard: (scanGuard: QRScanGuardState) => void;
    hydrate: () => Promise<void>;

    // Cloud Save
    isSaving: boolean;
    savedUrl: string | null;
    saveToCloud: () => Promise<void>;
}

export const useQRStore = create<QRState>((set, get) => ({
    url: 'https://reynubixvoice.com',
    qrType: 'url',
    vcardData: { ...DEFAULT_VCARD },
    theme: 'dark',
    qrStyle: { ...DEFAULT_QR_STYLE },

    isMobilePreview: false,
    toggleMobilePreview: () => set((state) => ({ isMobilePreview: !state.isMobilePreview })),

    setUrl: (url) => set({ url }),
    setQRType: (qrType) => set({ qrType }),
    updateVCard: (data) => set((state) => ({ vcardData: { ...state.vcardData, ...data } })),
    setTheme: (theme) => set({ theme }),
    updateQRStyle: (style) => set((state) => ({ qrStyle: normalizeQrStyle({ ...state.qrStyle, ...style }) })),
    setScanGuard: (scanGuard) => set((state) => ({ qrStyle: normalizeQrStyle({ ...state.qrStyle, scanGuard }) })),

    hydrate: async () =>
    {
        const draft = await loadDraft();
        if (draft)
        {
            set((state) => ({
                ...state,
                ...draft,
                vcardData: {
                    ...DEFAULT_VCARD,
                    ...(draft.vcardData ?? {}),
                },
                qrStyle: normalizeQrStyle((draft.qrStyle as Partial<QRStyleState>) ?? {}),
            }));
        }
    },

    isSaving: false,
    savedUrl: null,

    saveToCloud: async () =>
    {
        const state = get();
        // Exclude functions and transients
        const { isMobilePreview, toggleMobilePreview, setUrl, setQRType, updateVCard, setTheme, updateQRStyle, setScanGuard, hydrate, saveToCloud, isSaving, savedUrl, ...saveableState } = state;

        set({ isSaving: true, savedUrl: null });

        try
        {
            const shortCode = Math.random().toString(36).substring(2, 8);

            const { data, error } = await supabase.from('qr_studio_configs').insert({
                state: saveableState,
                short_code: shortCode
            }).select().single();

            if (error) throw error;

            const newUrl = `${window.location.origin}/qr/${shortCode}`;
            set({ savedUrl: newUrl });
        } catch (e)
        {
            console.error('Failed to save to cloud', e);
        } finally
        {
            set({ isSaving: false });
        }
    }
}));

// Subscribe to save drafts automatically
useQRStore.subscribe((state) =>
{
    const { isMobilePreview, toggleMobilePreview, setUrl, setQRType, updateVCard, setTheme, updateQRStyle, setScanGuard, hydrate, saveToCloud, isSaving, savedUrl, ...saveableState } = state;
    saveDraft(saveableState);
});
