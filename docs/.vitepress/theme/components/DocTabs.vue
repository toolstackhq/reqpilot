<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
});

const firstTab = computed(() => props.tabs[0]?.id ?? 'tab-0');
const activeTab = ref(firstTab.value);

const onSelect = (tabId) => {
  activeTab.value = tabId;
};
</script>

<template>
  <div class="rp-doc-tabs">
    <div class="rp-doc-tabs-list" role="tablist" aria-label="Documentation sections">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="rp-doc-tab-button"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id ? 'true' : 'false'"
        @click="onSelect(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <section
      v-for="tab in tabs"
      :key="tab.id"
      v-show="activeTab === tab.id"
      role="tabpanel"
      class="rp-doc-tab-panel"
    >
      <slot :name="tab.id" />
    </section>
  </div>
</template>
