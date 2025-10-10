import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const plugins = [];

  try {
    const { default: react } = await import('@vitejs/plugin-react');
    plugins.push(react());
  } catch (error) {
    console.warn(
      '[vite] لم يتم العثور على @vitejs/plugin-react. سيتم الاستمرار بدون دعم React Fast Refresh. لتجربة تطوير أفضل يرجى تثبيت الحزمة.'
    );
  }

  return {
    plugins,
    esbuild: {
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment'
    },
    server: {
      port: 5173,
      host: '0.0.0.0'
    }
  };
});
