import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [
		vitePreprocess(),
		preprocess({
			scss: {
				// Option to pass to sass compiler
				prependData: '@import "src/styles/themes.scss";'
			}
		})
	],
	kit: {
		alias: {
			'types': 'src/libtypes',
			'clients': 'src/lib/clients',
			'stores': 'src/lib/stores',
			'utils': 'src/lib/utils',
			'components': 'src/lib/components'
		},
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter()
	}
};

export default config;