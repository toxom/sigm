<script lang="ts">
    import { onMount } from 'svelte';
    import { pb, currentUser, ensureAuthenticated, signOut } from '$lib/pocketbase';
    import Loader from 'components/Loader.svelte';
    import UserProfileOverlay from 'components/UserProfileOverlay.svelte';
    
    // Don't import the SCSS file here if you're using @use in the style section
    
    let isLoading = true;
    let showProfileOverlay = false;
    let user = null;
    
    onMount(async () => {
      // Check if user is authenticated
      const isAuthenticated = await ensureAuthenticated();
      
      // Subscribe to the currentUser store
      currentUser.subscribe(value => {
        user = value;
      });
      
      // Simulate loading delay
      setTimeout(() => {
        isLoading = false;
      }, 800);
    });
    
    function toggleProfileOverlay() {
      showProfileOverlay = !showProfileOverlay;
    }
</script>
  
<Loader {isLoading} />
  
<div class="app-container">
  <header>
    <div class="logo">My App</div>
    <button class="profile-button" on:click={toggleProfileOverlay}>
      {user ? user.name || user.username : 'Sign In'}
    </button>
  </header>
    
  {#if showProfileOverlay}
    <UserProfileOverlay {user} on:close={() => showProfileOverlay = false} />
  {/if}
    
  <main>
    <slot />
  </main>
</div>
  
<style lang="scss">
  @use "../styles/themes.scss" as *;
  
  :global(body) {
    font-family: var(--font-primary);
    margin: 0;
    padding: 0;
  }
  
  :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
    font-family: var(--font-heading);
  }
  
  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid #eee;
    // This will override the global font for the header specifically
    font-family: var(--font-heading);
  }
  
  .logo {
    font-weight: bold;
    font-size: 1.5rem;
  }
  
  .profile-button {
    padding: 8px 16px;
    border: none;
    background-color: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: #e0e0e0;
    }
  }
</style>