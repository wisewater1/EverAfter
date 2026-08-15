/**
 * Shared oversight data hook. Loads the coverage overview (grant facts, no
 * financial values) and optionally the audited financial picture, and
 * refreshes on oversight mutations and tree hydration.
 */
import { useCallback, useEffect, useState } from 'react';
import {
    OVERSIGHT_UPDATED_EVENT,
    loadOversight,
    loadPicture,
    type OversightOverview,
    type OversightPicture,
} from '../../lib/gabriel/oversightStore';

export function useOversight(withPicture = false): {
    overview: OversightOverview | null;
    picture: OversightPicture | null;
    loading: boolean;
    reload: () => void;
} {
    const [overview, setOverview] = useState<OversightOverview | null>(null);
    const [picture, setPicture] = useState<OversightPicture | null>(null);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(() => {
        let cancelled = false;
        setLoading(true);
        void (async () => {
            const nextOverview = await loadOversight();
            if (cancelled) return;
            setOverview(nextOverview);
            if (withPicture) {
                const nextPicture = await loadPicture(nextOverview);
                if (cancelled) return;
                setPicture(nextPicture);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [withPicture]);

    useEffect(() => {
        const cancel = reload();
        const onChange = () => {
            reload();
        };
        window.addEventListener(OVERSIGHT_UPDATED_EVENT, onChange);
        window.addEventListener('everafter:genealogy-hydrated', onChange);
        return () => {
            cancel();
            window.removeEventListener(OVERSIGHT_UPDATED_EVENT, onChange);
            window.removeEventListener('everafter:genealogy-hydrated', onChange);
        };
    }, [reload]);

    return { overview, picture, loading, reload };
}
