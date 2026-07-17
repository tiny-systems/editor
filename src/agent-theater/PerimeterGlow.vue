<!--
  Soft "agent is thinking" indicator. Wrap any container with
  <PerimeterGlow :active="isAgentWorking">…</PerimeterGlow> and the
  border slowly breathes indigo while active.

  Earlier version used a spinning conic-gradient sweep — too
  attention-grabbing, felt like a loading spinner, and the
  3-color rainbow conflicted with the pricing-page indigo accent.
  Replaced with a calmer 2.4s opacity pulse on a static indigo
  glow. Subtle enough to live in the corner of the eye, distinct
  enough to register when the agent acts.

  Stays out of the way when inactive — no layout shift, no
  paint cost beyond a single background-image on the wrapper.
-->
<template>
  <div class="perimeter-glow-wrapper" :class="{ active }">
    <div v-if="active" class="perimeter-glow-layer" aria-hidden="true" />
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean
}>()
</script>

<style scoped>
/* Match the inner section's rounded-xl (0.75rem) so the glow
   layer follows the same corner radius as the card. With
   `border-radius: inherit` and no parent radius the glow used
   to render with square corners outside a rounded card. */
.perimeter-glow-wrapper {
  position: relative;
  border-radius: 0.75rem;
}

.perimeter-glow-layer {
  position: absolute;
  inset: -1px;
  border-radius: 0.75rem;
  padding: 1.5px;
  /* Single indigo glow, no rotation. The opacity animation does
     all the work — softer, less spinner-like. */
  background: linear-gradient(
    180deg,
    rgba(99, 102, 241, 0.55),
    rgba(129, 140, 248, 0.55)
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: perimeter-breathe 2.4s ease-in-out infinite;
  pointer-events: none;
  filter: blur(0.5px);
}

@keyframes perimeter-breathe {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.95; }
}

/* Reduced motion — drop the breathing too; show a steady soft
   border instead so it's still visibly "alive" but never moves. */
@media (prefers-reduced-motion: reduce) {
  .perimeter-glow-layer {
    animation: none;
    opacity: 0.6;
  }
}
</style>
