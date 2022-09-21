/**
 * Load bootstrap js
 */
import 'bootstrap'

/**
 * Load predefined css colors and styles
 */
import 'bootstrap/dist/css/bootstrap.min.css'

/**
 * Bootstrap depends on jquery and jquery global var $ can be used only after the page is fully loaded
 * So we need to instanciate it
 */
import $ from 'jquery';
window.jQuery = $;
window.$ = $;
 
/**
 * Finally load our app: buttons behavior, etc.
 */
import App from './App'

// start
const app = new App();