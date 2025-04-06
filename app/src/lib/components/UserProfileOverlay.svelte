<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { signIn, signUp, signOut } from '$lib/pocketbase';
    import { fly } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    
    export let user: any = null;
    
    const dispatch = createEventDispatcher();
    
    let email = '';
    let password = '';
    let isRegistering = false;
    let errorMessage = '';
    let isLoading = false;
    
    async function handleLogin() {
      isLoading = true;
      errorMessage = '';
      
      try {
        const result = await signIn(email, password);
        if (result) {
          dispatch('close');
          window.location.reload();
        } else {
          errorMessage = 'Login failed. Please check your credentials.';
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
      } finally {
        isLoading = false;
      }
    }
    
    async function handleRegister() {
      isLoading = true;
      errorMessage = '';
      
      try {
        const result = await signUp(email, password);
        if (result) {
          // Auto login after registration
          const loginResult = await signIn(email, password);
          if (loginResult) {
            dispatch('close');
            window.location.reload();
          } else {
            errorMessage = 'Registration successful but login failed. Please try logging in.';
          }
        } else {
          errorMessage = 'Registration failed. Please try again.';
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      } finally {
        isLoading = false;
      }
    }
    
    function handleLogout() {
      signOut();
      dispatch('close');
      window.location.reload();
    }
  </script>
  
  <div 
    class="overlay"
    transition:fly={{ y: -30, duration: 300, easing: quintOut }}
    on:click|self={() => dispatch('close')}
  >
    <div 
      class="overlay-content"
      transition:fly={{ y: 30, duration: 400, easing: quintOut }}
      on:click|stopPropagation
    >
      <button class="close-button" on:click={() => dispatch('close')}>×</button>
      
      {#if user}
        <h2>User Profile</h2>
        <p>Name: {user.name || 'Not set'}</p>
        <p>Username: {user.username || 'Not set'}</p>
        <p>Email: {user.email}</p>
        <button on:click={handleLogout}>Logout</button>
      {:else}
        <div class="tabs">
          <button class:active={!isRegistering} on:click={() => isRegistering = false}>Login</button>
          <button class:active={isRegistering} on:click={() => isRegistering = true}>Register</button>
        </div>
        
        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}
        
        {#if isRegistering}
          <form on:submit|preventDefault={handleRegister}>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" bind:value={email} required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input id="password" type="password" bind:value={password} required />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>
        {:else}
          <form on:submit|preventDefault={handleLogin}>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" bind:value={email} required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input id="password" type="password" bind:value={password} required />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        {/if}
      {/if}
    </div>
  </div>
  
  <style>
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1001;
    }
    
    .overlay-content {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .close-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 2rem;
      height: 2rem;
      color: white;
      background-color: red;
        border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      border: none;
      font-size: 24px;
      cursor: pointer;
    }
    
    .tabs {
      display: flex;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }
    
    .tabs button {
      flex: 1;
      padding: 10px;
      border: none;
      borrder-radius: 0;
      border-bottom: 2px solid #eee;
      cursor: pointer;

    }
    
    .tabs button.active {
        background: darkgray;
      border-bottom: 2px solid #080b0d;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
    }
    
    .form-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    button {
      padding: 10px 15px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
    }
    
    button:disabled {
      background-color: #95bce0;
      cursor: not-allowed;
    }
    
    .error {
      color: red;
      margin-bottom: 15px;
    }
  </style>