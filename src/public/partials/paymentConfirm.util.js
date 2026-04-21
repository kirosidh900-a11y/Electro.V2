/**
 * Payment-specific confirmation modals with enhanced UI and payment method icons
 */

export function confirmPayment(paymentMethod, amount = null, additionalInfo = "") {
  return new Promise((resolve) => {
    const confirmBox = document.createElement("div");
    
    // Payment method configurations
    const paymentConfig = {
      cod: {
        title: "Cash on Delivery",
        icon: "fa-solid fa-money-bill-wave",
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
        description: "Pay when your order is delivered to your doorstep.",
        buttonText: "Place Order",
        buttonColor: "bg-green-600 hover:bg-green-700"
      },
      wallet: {
        title: "Wallet Payment",
        icon: "fa-solid fa-wallet",
        iconColor: "text-blue-600", 
        bgColor: "bg-blue-100",
        description: "Amount will be deducted from your wallet immediately.",
        buttonText: "Pay Now",
        buttonColor: "bg-blue-600 hover:bg-blue-700"
      },
      razorpay: {
        title: "Online Payment",
        icon: "fa-solid fa-credit-card",
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100", 
        description: "You will be redirected to secure payment gateway.",
        buttonText: "Proceed to Pay",
        buttonColor: "bg-purple-600 hover:bg-purple-700"
      }
    };

    const config = paymentConfig[paymentMethod] || paymentConfig.razorpay;
    const amountDisplay = amount ? `<div class="text-2xl font-bold text-gray-900 mb-2">₹${amount.toLocaleString('en-IN')}</div>` : '';

    confirmBox.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
          
          <!-- Header -->
          <div class="p-6 text-center border-b border-gray-100">
            <div class="w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="${config.icon} text-2xl ${config.iconColor}"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Confirm ${config.title}</h3>
            ${amountDisplay}
            <p class="text-sm text-gray-600">${config.description}</p>
            ${additionalInfo ? `<p class="text-xs text-gray-500 mt-2">${additionalInfo}</p>` : ''}
          </div>

          <!-- Payment Details -->
          <div class="p-6 bg-gray-50">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Payment Method:</span>
              <span class="font-semibold text-gray-900 flex items-center gap-2">
                <i class="${config.icon} ${config.iconColor}"></i>
                ${config.title}
              </span>
            </div>
            ${amount ? `
            <div class="flex items-center justify-between text-sm mt-2">
              <span class="text-gray-600">Total Amount:</span>
              <span class="font-bold text-lg text-gray-900">₹${amount.toLocaleString('en-IN')}</span>
            </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="p-6 flex gap-3">
            <button id="cancelPaymentBtn"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button id="confirmPaymentBtn"
              class="flex-1 px-4 py-3 ${config.buttonColor} text-white rounded-xl text-sm font-semibold transition-colors shadow-lg hover:shadow-xl">
              ${config.buttonText}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(confirmBox);

    // Add click outside to close
    const backdrop = confirmBox.querySelector('.fixed');
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        confirmBox.remove();
        resolve(false);
      }
    };

    confirmBox.querySelector("#cancelPaymentBtn").onclick = () => {
      confirmBox.remove();
      resolve(false);
    };

    confirmBox.querySelector("#confirmPaymentBtn").onclick = () => {
      confirmBox.remove();
      resolve(true);
    };

    // Add escape key support
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        confirmBox.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

// Generic confirmation for other actions (backward compatibility)
export function confirmAction(title = "Are you sure?", message = "") {
  return new Promise((resolve) => {
    const confirmBox = document.createElement("div");

    confirmBox.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-gray-100">
          <div class="mb-4">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-question text-2xl text-blue-600"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
            ${message ? `<p class="text-sm text-gray-600">${message}</p>` : ''}
          </div>

          <div class="flex justify-center gap-3">
            <button id="cancelBtn"
              class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
              Cancel
            </button>
            <button id="confirmBtn"
              class="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors">
              Continue
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(confirmBox);

    // Add click outside to close
    const backdrop = confirmBox.querySelector('.fixed');
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        confirmBox.remove();
        resolve(false);
      }
    };

    confirmBox.querySelector("#cancelBtn").onclick = () => {
      confirmBox.remove();
      resolve(false);
    };

    confirmBox.querySelector("#confirmBtn").onclick = () => {
      confirmBox.remove();
      resolve(true);
    };

    // Add escape key support
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        confirmBox.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}