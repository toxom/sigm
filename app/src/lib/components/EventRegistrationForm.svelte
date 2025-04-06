<script lang="ts">
    // Define types for form data
    interface RegistrationFormData {
      name: string;
      email: string;
      phone: string;
      company?: string;
    }
  
    interface TicketOption {
      id: string;
      name: string;
      description: string;
      price: number;
    }
  
    interface PaymentDetails {
      cardName: string;
      cardNumber: string;
      expiryDate: string;
      cvv: string;
    }
  
    interface EventRegistration {
      registration: RegistrationFormData;
      ticket: TicketOption | null;
      payment: PaymentDetails;
    }
  
    // Available ticket options
    const ticketOptions: TicketOption[] = [
      {
        id: "standard",
        name: "Standard",
        description: "Basic event access",
        price: 49.99
      },
      {
        id: "premium",
        name: "Premium",
        description: "Event access with preferred seating",
        price: 99.99
      },
      {
        id: "vip",
        name: "VIP",
        description: "Full event access with exclusive perks",
        price: 149.99
      }
    ];
  
    // Form state
    let currentStep = 1;
    let formData: EventRegistration = {
      registration: {
        name: "",
        email: "",
        phone: "",
        company: ""
      },
      ticket: null,
      payment: {
        cardName: "",
        cardNumber: "",
        expiryDate: "",
        cvv: ""
      }
    };
  
    // Toggle state
    let isFormExpanded = false;
  
    // Validation state
    let nameValid = false;
    let emailValid = false;
    let phoneValid = false;
    let registrationValid = false;
    let ticketSelected = false;
    let paymentValid = false;
  
    // Event details
    const eventDetails = {
      name: "AI Conference 2025",
      date: "May 15-17, 2025",
      location: "San Francisco, USA"
    };
  
    // Validate registration data
    $: {
      nameValid = formData.registration.name.trim().length > 0;
      emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.registration.email);
      phoneValid = formData.registration.phone.trim().length > 0;
      registrationValid = nameValid && emailValid && phoneValid;
    }
  
    // Validate ticket selection
    $: ticketSelected = formData.ticket !== null;
  
    // Validate payment details
    $: {
      const { cardName, cardNumber, expiryDate, cvv } = formData.payment;
      paymentValid = 
        cardName.trim().length > 0 && 
        cardNumber.trim().length === 16 && 
        /^\d+$/.test(cardNumber) &&
        expiryDate.trim().length > 0 &&
        cvv.trim().length > 0;
    }
  
    // Toggle form visibility
    function toggleForm() {
      isFormExpanded = !isFormExpanded;
    }
  
    // Navigation functions
    function nextStep() {
      if (currentStep < 4) {
        currentStep += 1;
      }
    }
  
    function prevStep() {
      if (currentStep > 1) {
        currentStep -= 1;
      }
    }
  
    // Handle form submission
    function handleSubmit() {
      alert("Registration completed successfully!");
      console.log("Form data:", formData);
      isFormExpanded = false;
      currentStep = 1;
    }
  
    // Mock add to calendar function
    function addToCalendar() {
      alert("Event added to your calendar!");
    }
  </script>
  
  <div class="registration-container">
    <!-- Stylish Event Header -->
    <div class="event-header" class:minimized={isFormExpanded} on:click={toggleForm}>
      <div class="event-title">{eventDetails.name}</div>
      <div class="event-details">
        <span>{eventDetails.date}</span>
        <span class="location-dot">•</span>
        <span>{eventDetails.location}</span>
      </div>
      <button class="toggle-button">
        {isFormExpanded ? 'Close' : 'Register Now'}
      </button>
    </div>
  
    <!-- Registration Form -->
    {#if isFormExpanded}
      <div class="registration-form">
        <div class="progress-bar">
          <div class="step" class:active={currentStep >= 1}>1. Registration</div>
          <div class="step" class:active={currentStep >= 2}>2. Tickets</div>
          <div class="step" class:active={currentStep >= 3}>3. Payment</div>
          <div class="step" class:active={currentStep >= 4}>4. Complete</div>
        </div>
  
        <div class="form-content">
          <!-- Step 1: Basic Registration Form -->
          {#if currentStep === 1}
            <section class="form-section">
              <h2>Personal Information</h2>
              <div class="form-group">
                <label for="name">Full Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="name" 
                  bind:value={formData.registration.name} 
                  required
                  class:invalid={!nameValid && formData.registration.name !== ""}
                />
                {#if !nameValid && formData.registration.name !== ""}
                  <span class="error">Please enter your name</span>
                {/if}
              </div>
  
              <div class="form-group">
                <label for="email">Email <span class="required">*</span></label>
                <input 
                  type="email" 
                  id="email" 
                  bind:value={formData.registration.email} 
                  required
                  class:invalid={!emailValid && formData.registration.email !== ""}
                />
                {#if !emailValid && formData.registration.email !== ""}
                  <span class="error">Please enter a valid email address</span>
                {/if}
              </div>
  
              <div class="form-group">
                <label for="phone">Phone Number <span class="required">*</span></label>
                <input 
                  type="tel" 
                  id="phone" 
                  bind:value={formData.registration.phone} 
                  required
                  class:invalid={!phoneValid && formData.registration.phone !== ""}
                />
                {#if !phoneValid && formData.registration.phone !== ""}
                  <span class="error">Please enter your phone number</span>
                {/if}
              </div>
  
              <div class="form-group">
                <label for="company">Company (Optional)</label>
                <input type="text" id="company" bind:value={formData.registration.company} />
              </div>
  
              <div class="button-group">
                <button class="primary-button" on:click={nextStep} disabled={!registrationValid}>Continue to Tickets</button>
              </div>
            </section>
          {/if}
  
          <!-- Step 2: Ticket Selection -->
          {#if currentStep === 2}
            <section class="form-section">
              <h2>Choose Your Ticket</h2>
              
              <div class="ticket-options">
                {#each ticketOptions as option}
                  <div 
                    class="ticket-option" 
                    class:selected={formData.ticket?.id === option.id}
                    on:click={() => formData.ticket = option}
                  >
                    <div class="ticket-name">{option.name}</div>
                    <div class="ticket-description">{option.description}</div>
                    <div class="ticket-price">${option.price.toFixed(2)}</div>
                  </div>
                {/each}
              </div>
  
              <div class="button-group">
                <button class="secondary-button" on:click={prevStep}>Back</button>
                <button class="primary-button" on:click={nextStep} disabled={!ticketSelected}>Continue to Payment</button>
              </div>
            </section>
          {/if}
  
          <!-- Step 3: Payment Details -->
          {#if currentStep === 3}
            <section class="form-section">
              <h2>Payment Information</h2>
              <p class="mock-notice">This is a mock payment form for demonstration purposes.</p>
  
              <div class="form-group">
                <label for="cardName">Name on Card <span class="required">*</span></label>
                <input type="text" id="cardName" bind:value={formData.payment.cardName} required />
              </div>
  
              <div class="form-group">
                <label for="cardNumber">Card Number <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="cardNumber" 
                  bind:value={formData.payment.cardNumber} 
                  placeholder="1234 5678 9012 3456" 
                  maxlength="16"
                  required
                />
              </div>
  
              <div class="payment-row">
                <div class="form-group">
                  <label for="expiryDate">Expiry Date <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="expiryDate" 
                    bind:value={formData.payment.expiryDate} 
                    placeholder="MM/YY" 
                    required
                  />
                </div>
  
                <div class="form-group">
                  <label for="cvv">CVV <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="cvv" 
                    bind:value={formData.payment.cvv} 
                    maxlength="4" 
                    required
                  />
                </div>
              </div>
  
              <div class="button-group">
                <button class="secondary-button" on:click={prevStep}>Back</button>
                <button class="primary-button" on:click={nextStep} disabled={!paymentValid}>Complete Registration</button>
              </div>
            </section>
          {/if}
  
          <!-- Step 4: Confirmation -->
          {#if currentStep === 4}
            <section class="form-section confirmation">
              <h2>Registration Complete!</h2>
              <div class="confirmation-details">
                <p>Thank you, {formData.registration.name}, for registering for our event.</p>
                <p>A confirmation email has been sent to {formData.registration.email}.</p>
                
                <div class="ticket-summary">
                  <h3>Your Ticket</h3>
                  <p><strong>Type:</strong> {formData.ticket?.name}</p>
                  <p><strong>Price:</strong> ${formData.ticket?.price.toFixed(2)}</p>
                </div>
                
                <button class="calendar-button" on:click={addToCalendar}>
                  Add to Calendar
                </button>
              </div>
  
              <div class="button-group">
                <button class="secondary-button" on:click={prevStep}>Back</button>
                <button class="primary-button" on:click={handleSubmit}>Done</button>
              </div>
            </section>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  
  <style>
    .registration-container {
      max-width: 800px;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: all 0.3s ease;
    }
  
    .event-header {
      background: linear-gradient(135deg, #3a76d8 0%, #9013fe 100%);
      color: white;
      padding: 2rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      height: 50vh;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
  
    .event-header.minimized {
      padding: 1rem;
      height: auto;
    }
  
    .event-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      line-height: 1.2;
      transition: all 0.3s ease;
      
    }
  
    .event-header.minimized .event-title {
      font-size: 1.2rem;
    }
  
    .event-details {
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      font-weight: 300;
      transition: all 0.3s ease;
    }
  
    .event-header.minimized .event-details {
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
  
    .location-dot {
      margin: 0 0.5rem;
    }
  
    .toggle-button {
      background-color: white;
      color: #3a76d8;
      border: none;
      border-radius: 4px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  
    .toggle-button:hover {
      background-color: #f8f9fa;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  
    .registration-form {
      padding: 1.5rem;
      background-color: white;
      max-height: 100%;
      overflow-y: auto;
      transition: max-height 0.3s ease;
    }
  
    .progress-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
      background-color: white;
      z-index: 10;
    }
  
    .step {
      color: #888;
      font-weight: 500;
      position: relative;
      font-size: 0.8rem;
    }
  
    .step.active {
      color: #4a86e8;
      font-weight: 600;
    }
  
    .form-content {
      animation: fadeIn 0.3s ease-in-out;
    }
  
    .form-section {
      padding-bottom: 1rem;
    }
  
    h2 {
      margin-bottom: 1rem;
      color: #333;
      font-size: 1.2rem;
    }
  
    .form-group {
      margin-bottom: 1rem;
    }
  
    label {
      display: block;
      margin-bottom: 0.3rem;
      font-weight: 500;
      font-size: 0.9rem;
    }
  
    .required {
      color: #e53935;
    }
  
    input {
      width: 100%;
      padding: 0.5rem;
      font-size: 0.9rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      transition: border-color 0.2s;
    }
  
    input:focus {
      outline: none;
      border-color: #4a86e8;
    }
  
    input.invalid {
      border-color: #e53935;
    }
  
    .error {
      color: #e53935;
      font-size: 0.75rem;
      margin-top: 0.2rem;
      display: block;
    }
  
    .button-group {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
  
    button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s, opacity 0.2s;
    }
  
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  
    .primary-button {
      background-color: #4a86e8;
      color: white;
      border: none;
    }
  
    .primary-button:hover:not(:disabled) {
      background-color: #3a76d8;
    }
  
    .secondary-button {
      background-color: transparent;
      color: #4a86e8;
      border: 1px solid #4a86e8;
    }
  
    .secondary-button:hover {
      background-color: rgba(74, 134, 232, 0.1);
    }
  
    /* Ticket selection styles */
    .ticket-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
  
    .ticket-option {
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .ticket-option:hover {
      border-color: #4a86e8;
    }
  
    .ticket-option.selected {
      border-color: #4a86e8;
      background-color: rgba(74, 134, 232, 0.1);
    }
  
    .ticket-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.3rem;
    }
  
    .ticket-description {
      color: #666;
      margin-bottom: 0.3rem;
      font-size: 0.85rem;
    }
  
    .ticket-price {
      font-weight: 600;
      color: #4a86e8;
      font-size: 1rem;
    }
  
    /* Payment form styles */
    .payment-row {
      display: flex;
      gap: 0.75rem;
    }
  
    .payment-row .form-group {
      flex: 1;
    }
  
    .mock-notice {
      margin-bottom: 1rem;
      padding: 0.5rem;
      background-color: #fff8e1;
      border-left: 4px solid #ffc107;
      color: #856404;
      font-size: 0.85rem;
    }
  
    /* Confirmation styles */
    .confirmation-details {
      background-color: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
  
    .ticket-summary {
      margin: 1rem 0;
      padding-top: 0.75rem;
      border-top: 1px solid #e0e0e0;
    }
  
    .calendar-button {
      display: inline-block;
      background-color: #43a047;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.75rem;
      transition: background-color 0.2s;
      font-size: 0.9rem;
    }
  
    .calendar-button:hover {
      background-color: #388e3c;
    }
  
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  
    /* Custom scrollbar */
    .registration-form::-webkit-scrollbar {
      width: 8px;
    }
  
    .registration-form::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
  
    .registration-form::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
  
    .registration-form::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  </style>