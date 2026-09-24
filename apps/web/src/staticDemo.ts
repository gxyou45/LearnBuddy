/** GitHub Pages build mode. The normal build keeps using the API-backed catalog. */
export const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === 'true';
