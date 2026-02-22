import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { buildVCardString } from '../../lib/qr/vcard';

export default function QRRedirect()
{
    const { id } = useParams<{ id: string }>();
    const [error, setError] = useState<string | null>(null);

    useEffect(() =>
    {
        async function processRedirect()
        {
            if (!id) return;

            try
            {
                // Fetch config
                const { data, error: fetchError } = await supabase
                    .from('qr_studio_configs')
                    .select('*')
                    .eq('short_code', id)
                    .single();

                if (fetchError || !data)
                {
                    setError('QR Code not found');
                    return;
                }

                // Increment scan count async
                supabase.rpc('increment_qr_scan', { row_id: data.id }).then(({ error: rpcErr }) =>
                {
                    if (rpcErr)
                    {
                        // fallback if rpc doesn't exist, just update manually
                        supabase.from('qr_studio_configs')
                            .update({ scan_count: (data.scan_count || 0) + 1 })
                            .eq('id', data.id)
                            .then(({ error: updateErr }) =>
                            {
                                if (updateErr) console.error(updateErr);
                            });
                    }
                });

                // Redirect logic based on state type
                const state = data.state;
                if (state.qrType === 'url')
                {
                    window.location.replace(state.url);
                } else if (state.qrType === 'vcard')
                {
                    // Render vCard download directly
                    const vcard = buildVCardString(state.vcardData);
                    const blob = new Blob([vcard], { type: 'text/vcard' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contact.vcf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setError('Downloading vCard...');
                    // Redirect to home after 3 sec
                    setTimeout(() =>
                    {
                        window.location.replace('/');
                    }, 3000);
                } else
                {
                    // just show text
                    setError(state.url);
                }
            } catch (err)
            {
                setError('Failed to process redirect');
            }
        }

        processRedirect();
    }, [id]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-main text-text-primary">
            {!error ? (
                <>
                    <Loader2 className="animate-spin text-brand-primary mb-4" size={40} />
                    <h2 className="text-xl font-display font-medium">Processing QR Code...</h2>
                </>
            ) : (
                <div className="text-center space-y-4 max-w-sm px-4">
                    <p className="text-lg text-text-secondary">{error}</p>
                    {error.includes('vCard') ? null : (
                        <a href="/" className="inline-block mt-4 text-brand-primary hover:underline">
                            Return Home
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
