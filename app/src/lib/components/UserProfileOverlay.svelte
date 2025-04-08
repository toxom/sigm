<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { signIn, signUp, signOut } from '$lib/pocketbase';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import GoogleSignIn from './buttons/GoogleSignIn.svelte';
  import { writable } from 'svelte/store';
  import type { User } from 'types/userTypes';
  
  export let user: User | null = null;
  
  const dispatch = createEventDispatcher();
  
  // Create userStore if needed
  export const userStore = writable<User | null>(user);
  
  // Update store when user prop changes
  $: {
    if (user) {
      userStore.set(user);
    }
  }
  
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
      <div class="profile-container">
        <div class="profile-header">
          <div class="avatar-container">
            {#if user.avatar}
              <img src={user.avatar} alt="User avatar" class="avatar" />
            {:else}
              <div class="avatar-placeholder">
                {(user.firstName?.[0] || user.email?.[0] || '').toUpperCase()}
              </div>
            {/if}
          </div>
          <h2 class="profile-name">{user.firstName || user.username || user.email.split('@')[0]}</h2>
        </div>
        
        <div class="profile-info">
          <div class="info-section">
            <h3>Account Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">{user.email}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Username</span>
                <span class="info-value">{user.username || 'Not set'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">First Name</span>
                <span class="info-value">{user.firstName || 'Not set'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Name</span>
                <span class="info-value">{user.lastName || 'Not set'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Residence</span>
                <span class="info-value">{user.residence || 'Not set'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Verified</span>
                <span class="info-value">{user.verified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Preferences</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Theme</span>
                <span class="info-value">{user.themePreference || 'System default'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Language</span>
                <span class="info-value">{user.languagePreference || 'English'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Currency</span>
                <span class="info-value">{user.currencyPreference || 'USD'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Timezone</span>
                <span class="info-value">{user.timezonePreference || 'UTC'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Notifications</span>
                <span class="info-value">{user.notificationsPreference || 'Enabled'}</span>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Security</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">2FA Status</span>
                <span class="info-value">{user.factorValidated ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">KYC Status</span>
                <span class="info-value">{user.kycValidated ? 'Verified' : 'Not verified'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Created</span>
                <span class="info-value">{new Date(user.created).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Updated</span>
                <span class="info-value">{new Date(user.updated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button class="logout-button" on:click={handleLogout}>Logout</button>
      </div>
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
          <button type="submit" class="auth-button" disabled={isLoading}>
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
          <button type="submit" class="auth-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      {/if}
      <GoogleSignIn/>
    {/if}
  </div>
</div>

<style lang="scss">
@use "../../styles/themes.scss" as *;

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
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  background: transparent;
  color: gray;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  font-size: 40px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
    color: red;
  }
}

.tabs {
  display: flex;
  margin-bottom: 20px;
}

.tabs button {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 0;
  border-bottom: 2px solid #eee;
  cursor: pointer;
  font-size: 1.5rem;
  letter-spacing: 0.25rem;
  transition: all 0.3s ease;
  color: gray;
  background-color: transparent;
}

.tabs button.active {
  border-bottom: 2px solid #080b0d;
  font-weight: 800;
  letter-spacing: 0.5rem;
  color: black;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px; 
  border: 1px solid #ddd;
  border-radius: 1rem;
  font-size: 1.25rem !important; 
  height: auto;
  line-height: 1.5;
  box-sizing: border-box;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #4285F4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }
}

.auth-button {
  padding: 12px 16px;
  background-color: #4285F4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-bottom: 16px;
  
  &:hover {
    background-color: #3367d6;
  }
  
  &:disabled {
    background-color: #95bce0;
    cursor: not-allowed;
  }
}

.error {
  color: #d32f2f;
  margin-bottom: 15px;
  font-size: 0.9rem;
  padding: 8px 12px;
  background-color: rgba(211, 47, 47, 0.1);
  border-radius: 4px;
}

// Profile styling
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.avatar-container {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #f5f5f5;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #4285F4;
  color: white;
  font-size: 3rem;
  font-weight: bold;
}

.profile-name {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.info-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.info-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.3rem;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 1.1rem;
  color: #333;
  word-break: break-word;
}

.logout-button {
  padding: 12px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 8px;
  
  &:hover {
    background-color: #d32f2f;
  }
}
</style>