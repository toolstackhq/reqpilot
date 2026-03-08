import DefaultTheme from 'vitepress/theme';
import './style.css';
import DocTabs from './components/DocTabs.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DocTabs', DocTabs);
  },
};
