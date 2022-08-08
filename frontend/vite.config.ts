import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ command, mode, ssrBuild }) => {
  if (command === 'serve') {
    return {
  		plugins: [svelte()],
		define: {
		  SOCKET_URL: JSON.stringify("https://harshith.xyz")
		},
		base: '/',
    }
  } else {
    // command === 'build'
    return {
  		plugins: [svelte()],
		define: {
		  SOCKET_URL: JSON.stringify("https://harshith.xyz")
		},
		base: '/chat/',
    }
  }
})

