import { ref, onMounted, onUnmounted } from "vue";

export function useShiftKeyWatcher() {
  const shiftPressed = ref(false);

  function checkKeyDown(event) {
    shiftPressed.value = event.key === "Shift";
  }

  function checkKeyUp(event) {
    shiftPressed.value &&= event.key !== "Shift";
  }

  onMounted(() => document.addEventListener("keydown", checkKeyDown));
  onMounted(() => document.addEventListener("keyup", checkKeyUp));
  onUnmounted(() => document.removeEventListener("keydown", checkKeyDown));
  onUnmounted(() => document.removeEventListener("keyup", checkKeyUp));

  return shiftPressed;
}
