// Whether the non-core routes are part of this build.
//
// App.tsx redirects every non-core route to the dashboard when this is false,
// so any surface that offers a link into one of those routes has to ask first.
// Otherwise the control looks live, and pressing it drops the person on the
// dashboard with no explanation of what happened.
export const nonCoreRoutesEnabled = import.meta.env.VITE_ENABLE_NON_CORE_ROUTES === 'true';
