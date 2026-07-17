// Subscription store — on the hosted platform this gates project limits by
// plan. Locally there are no plans, so the library ships a permissive stub:
// unlimited flows, no-op fetch. Same shape the project page reads
// (flowLimitPerProject, fetchSubscription).

import { defineStore } from 'pinia'

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    // -1 means unlimited (the project page renders "unlimited" for limit < 0).
    flowLimitPerProject: -1,
  }),
  actions: {
    async fetchSubscription() {
      // no-op locally
    },
  },
})
