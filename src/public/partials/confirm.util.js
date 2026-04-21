export function confirmAction(title = "Are you sure?", message = "") {
  return new Promise((resolve) => {
    const confirmBox = document.createElement("div");

    confirmBox.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-2xl shadow-2xl w-[400px] max-w-[90vw] text-center border border-gray-100">
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