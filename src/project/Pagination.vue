<script>
export default {
  props: {
    activePage: Number, // starting from 0
    pageCount: Number,
  },
  data() {
    return {
      offset: 4 ,
    };
  },
  methods: {
    computeActivePage(activePage) {
      if (activePage < 1) {
        return 0;
      }
      if (activePage > this.pageCount - 1) {
        return this.pageCount - 1;
      }
      return activePage;
    },
  },
  computed: {
    pageNumbers() {
      return [...Array(this.pageCount).keys()];
    },
  },
};
</script>
<template>
  <div class="flex items-center justify-between px-4 py-3 sm:px-6">
    <div class="flex flex-1 justify-between sm:hidden">
      <a href="#" class="relative inline-flex items-center rounded-md  px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-500">Previous</a>
      <a href="#" class="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-500">Next</a>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-start">
      <nav class="isolate inline-flex -space-x-px" aria-label="Pagination">
        <a href="#" class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-500 focus:z-20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded" v-if="activePage > 0" @click.prevent="$emit('setActivePage', computeActivePage(activePage - 1))" aria-label="Previous page">
          <span class="sr-only">Previous</span>
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
          </svg>
        </a>
        <a href="#" aria-current="page"
            @click.prevent="$emit('setActivePage', computeActivePage(0))"
            v-if="activePage >= offset + 1"
           :class="['relative z-10 inline-flex items-center px-4 py-2 text-sm font-medium focus:z-20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded', activePage == 0 ? 'bg-indigo-500 text-white' : 'text-gray-700 dark:text-gray-300']">
            1
        </a>
        <span class="relative inline-flex items-center  px-4 py-2 text-sm font-medium text-gray-700" v-if="activePage >= offset + offset - 2">...</span>
        <template v-for="pageNumber in pageNumbers" :key="pageNumber">
          <a href="#" @click.prevent="$emit('setActivePage', computeActivePage(pageNumber))" :class="['relative inline-flex items-center px-4 py-2 text-sm font-medium focus:z-20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded', activePage == pageNumber ? 'bg-indigo-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-indigo-500']"
               v-if="pageNumber >= activePage - offset && pageNumber <= activePage + offset">
              {{ pageNumber + 1 }}
          </a>
        </template>
        <span class="relative inline-flex items-center  px-4 py-2 text-sm font-medium text-gray-700" v-if="activePage + offset <= pageCount - offset + 1">...</span>

        <a href="#"
          @click.prevent="$emit('setActivePage', computeActivePage(pageCount))"
          v-if="activePage + offset <= pageCount - offset + 2"
          :class="['relative inline-flex items-center px-4 py-2 text-sm font-medium focus:z-20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded', activePage === pageCount -1 ? 'bg-indigo-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-indigo-500']"
        >
          {{ pageCount }}
        </a>
        <a href="#" v-if="activePage < pageCount -1" @click.prevent="$emit('setActivePage', computeActivePage(activePage + 1))" class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-500 focus:z-20 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded" aria-label="Next page">
          <span class="sr-only">Next</span>
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
          </svg>
        </a>
      </nav>
    </div>
  </div>

</template>
