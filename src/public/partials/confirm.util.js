export function confirmAction(message = "Are you sure?") {
  return new Promise((resolve) => {
    const confirmBox = document.createElement("div");

    confirmBox.innerHTML = `
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div class="bg-[#0b1220] p-6 rounded-xl border border-white/10 w-[320px] text-center">
          <p class="text-white mb-6">${message}</p>

          <div class="flex justify-center gap-4">
            <button id="cancelBtn"
              class="px-4 py-2 bg-gray-600 rounded-lg text-sm">
              Cancel
            </button>

            <button id="confirmBtn"
              class="px-4 py-2 bg-red-600 rounded-lg text-sm">
              Confirm
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(confirmBox);

    confirmBox.querySelector("#cancelBtn").onclick = () => {
      confirmBox.remove();
      resolve(false);
    };

    confirmBox.querySelector("#confirmBtn").onclick = () => {
      confirmBox.remove();
      resolve(true);
    };
  });
}
