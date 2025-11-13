// See the "/licenses" URI for full package license details
var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// resources/js/services/events.ts
var EventManager = class {
  constructor() {
    __publicField(this, "listeners", {});
    __publicField(this, "stack", []);
  }
  /**
   * Emit a custom event for any handlers to pick-up.
   */
  emit(eventName, eventData = {}) {
    this.stack.push({ name: eventName, data: eventData });
    const listenersToRun = this.listeners[eventName] || [];
    for (const listener of listenersToRun) {
      listener(eventData);
    }
  }
  /**
   * Listen to a custom event and run the given callback when that event occurs.
   */
  listen(eventName, callback) {
    if (typeof this.listeners[eventName] === "undefined") this.listeners[eventName] = [];
    this.listeners[eventName].push(callback);
  }
  /**
   * Remove an event listener which is using the given callback for the given event name.
   */
  remove(eventName, callback) {
    const listeners = this.listeners[eventName] || [];
    const index2 = listeners.indexOf(callback);
    if (index2 !== -1) {
      listeners.splice(index2, 1);
    }
  }
  /**
   * Emit an event for public use.
   * Sends the event via the native DOM event handling system.
   */
  emitPublic(targetElement, eventName, eventData) {
    const event = new CustomEvent(eventName, {
      detail: eventData,
      bubbles: true
    });
    targetElement.dispatchEvent(event);
  }
  /**
   * Emit a success event with the provided message.
   */
  success(message) {
    this.emit("success", message);
  }
  /**
   * Emit an error event with the provided message.
   */
  error(message) {
    this.emit("error", message);
  }
  /**
   * Notify of standard server-provided validation errors.
   */
  showValidationErrors(responseErr) {
    if (responseErr.status === 422 && responseErr.data) {
      const message = Object.values(responseErr.data).flat().join("\n");
      this.error(message);
    }
  }
  /**
   * Notify standard server-provided error messages.
   */
  showResponseError(responseErr) {
    if (!responseErr.status) return;
    if (responseErr.status >= 400 && typeof responseErr.data === "object" && responseErr.data.message) {
      this.error(responseErr.data.message);
    }
  }
};

// resources/js/services/http.ts
var HttpError = class extends Error {
  constructor(response, content) {
    super(response.statusText);
    __publicField(this, "data");
    __publicField(this, "headers");
    __publicField(this, "original");
    __publicField(this, "redirected");
    __publicField(this, "status");
    __publicField(this, "statusText");
    __publicField(this, "url");
    this.data = content;
    this.headers = response.headers;
    this.redirected = response.redirected;
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.original = response;
  }
};
var HttpManager = class {
  /**
   * Get the content from a fetch response.
   * Checks the content-type header to determine the format.
   */
  async getResponseContent(response) {
    if (response.status === 204) {
      return null;
    }
    const responseContentType = response.headers.get("Content-Type") || "";
    const subType = responseContentType.split(";")[0].split("/").pop();
    if (subType === "javascript" || subType === "json") {
      return response.json();
    }
    return response.text();
  }
  createXMLHttpRequest(method, url, events = {}) {
    const csrfToken = document.querySelector("meta[name=token]")?.getAttribute("content");
    const req = new XMLHttpRequest();
    for (const [eventName, callback] of Object.entries(events)) {
      req.addEventListener(eventName, callback.bind(req));
    }
    req.open(method, url);
    req.withCredentials = true;
    req.setRequestHeader("X-CSRF-TOKEN", csrfToken || "");
    return req;
  }
  /**
   * Create a new HTTP request, setting the required CSRF information
   * to communicate with the back-end. Parses & formats the response.
   */
  async request(url, options2 = {}) {
    let requestUrl = url;
    if (!requestUrl.startsWith("http")) {
      requestUrl = window.baseUrl(requestUrl);
    }
    if (options2.params) {
      const urlObj = new URL(requestUrl);
      for (const paramName of Object.keys(options2.params)) {
        const value = options2.params[paramName];
        if (typeof value !== "undefined" && value !== null) {
          urlObj.searchParams.set(paramName, value);
        }
      }
      requestUrl = urlObj.toString();
    }
    const csrfToken = document.querySelector("meta[name=token]")?.getAttribute("content") || "";
    const requestOptions = { ...options2, credentials: "same-origin" };
    requestOptions.headers = {
      ...requestOptions.headers || {},
      baseURL: window.baseUrl(""),
      "X-CSRF-TOKEN": csrfToken
    };
    const response = await fetch(requestUrl, requestOptions);
    const content = await this.getResponseContent(response) || "";
    const returnData = {
      data: content,
      headers: response.headers,
      redirected: response.redirected,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      original: response
    };
    if (!response.ok) {
      throw new HttpError(response, content);
    }
    return returnData;
  }
  /**
   * Perform a HTTP request to the back-end that includes data in the body.
   * Parses the body to JSON if an object, setting the correct headers.
   */
  async dataRequest(method, url, data) {
    const options2 = {
      method,
      body: data
    };
    if (typeof data === "object" && !(data instanceof FormData)) {
      options2.headers = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      };
      options2.body = JSON.stringify(data);
    }
    if (data instanceof FormData && method !== "post") {
      data.append("_method", method);
      options2.method = "post";
    }
    return this.request(url, options2);
  }
  /**
   * Perform a HTTP GET request.
   * Can easily pass query parameters as the second parameter.
   */
  async get(url, params = {}) {
    return this.request(url, {
      method: "GET",
      params
    });
  }
  /**
   * Perform a HTTP POST request.
   */
  async post(url, data = null) {
    return this.dataRequest("POST", url, data);
  }
  /**
   * Perform a HTTP PUT request.
   */
  async put(url, data = null) {
    return this.dataRequest("PUT", url, data);
  }
  /**
   * Perform a HTTP PATCH request.
   */
  async patch(url, data = null) {
    return this.dataRequest("PATCH", url, data);
  }
  /**
   * Perform a HTTP DELETE request.
   */
  async delete(url, data = null) {
    return this.dataRequest("DELETE", url, data);
  }
  /**
   * Parse the response text for an error response to a user
   * presentable string. Handles a range of errors responses including
   * validation responses & server response text.
   */
  formatErrorResponseText(text) {
    const data = text.startsWith("{") ? JSON.parse(text) : { message: text };
    if (!data) {
      return text;
    }
    if (data.message || data.error) {
      return data.message || data.error;
    }
    const values = Object.values(data);
    const isValidation = values.every((val) => {
      return Array.isArray(val) && val.every((x) => typeof x === "string");
    });
    if (isValidation) {
      return values.flat().join(" ");
    }
    return text;
  }
};

// resources/js/services/translations.ts
var Translator = class {
  /**
   * Parse the given translation and find the correct plural option
   * to use. Similar format at Laravel's 'trans_choice' helper.
   */
  choice(translation, count, replacements = {}) {
    replacements = Object.assign({}, { count: String(count) }, replacements);
    const splitText = translation.split("|");
    const exactCountRegex = /^{([0-9]+)}/;
    const rangeRegex = /^\[([0-9]+),([0-9*]+)]/;
    let result = null;
    for (const t of splitText) {
      const exactMatches = t.match(exactCountRegex);
      if (exactMatches !== null && Number(exactMatches[1]) === count) {
        result = t.replace(exactCountRegex, "").trim();
        break;
      }
      const rangeMatches = t.match(rangeRegex);
      if (rangeMatches !== null) {
        const rangeStart = Number(rangeMatches[1]);
        if (rangeStart <= count && (rangeMatches[2] === "*" || Number(rangeMatches[2]) >= count)) {
          result = t.replace(rangeRegex, "").trim();
          break;
        }
      }
    }
    if (result === null && splitText.length > 1) {
      result = count === 1 ? splitText[0] : splitText[1];
    }
    if (result === null) {
      result = splitText[0];
    }
    return this.performReplacements(result, replacements);
  }
  performReplacements(string, replacements) {
    const replaceMatches = string.match(/:(\S+)/g);
    if (replaceMatches === null) {
      return string;
    }
    let updatedString = string;
    for (const match of replaceMatches) {
      const key = match.substring(1);
      if (typeof replacements[key] === "undefined") {
        continue;
      }
      updatedString = updatedString.replace(match, replacements[key]);
    }
    return updatedString;
  }
};

// resources/js/components/index.ts
var components_exports = {};
__export(components_exports, {
  AddRemoveRows: () => AddRemoveRows,
  AjaxDeleteRow: () => AjaxDeleteRow,
  AjaxForm: () => AjaxForm,
  Attachments: () => Attachments,
  AttachmentsList: () => AttachmentsList,
  AutoSubmit: () => AutoSubmit,
  AutoSuggest: () => AutoSuggest,
  BackToTop: () => BackToTop,
  BookSort: () => BookSort,
  ChapterContents: () => ChapterContents,
  CodeEditor: () => CodeEditor,
  CodeHighlighter: () => CodeHighlighter,
  CodeTextarea: () => CodeTextarea,
  Collapsible: () => Collapsible,
  ConfirmDialog: () => ConfirmDialog,
  CustomCheckbox: () => CustomCheckbox,
  DetailsHighlighter: () => DetailsHighlighter,
  Dropdown: () => Dropdown,
  DropdownSearch: () => DropdownSearch,
  Dropzone: () => Dropzone,
  EditorToolbox: () => EditorToolbox,
  EntityPermissions: () => EntityPermissions,
  EntitySearch: () => EntitySearch,
  EntitySelector: () => EntitySelector,
  EntitySelectorPopup: () => EntitySelectorPopup,
  EventEmitSelect: () => EventEmitSelect,
  ExpandToggle: () => ExpandToggle,
  GlobalSearch: () => GlobalSearch,
  HeaderMobileToggle: () => HeaderMobileToggle,
  ImageManager: () => ImageManager,
  ImagePicker: () => ImagePicker,
  ListSortControl: () => ListSortControl,
  LoadingButton: () => LoadingButton,
  MarkdownEditor: () => MarkdownEditor,
  NewUserPassword: () => NewUserPassword,
  Notification: () => Notification,
  OptionalInput: () => OptionalInput,
  PageComment: () => PageComment,
  PageCommentReference: () => PageCommentReference,
  PageComments: () => PageComments,
  PageDisplay: () => PageDisplay,
  PageEditor: () => PageEditor,
  PagePicker: () => PagePicker,
  PermissionsTable: () => PermissionsTable,
  Pointer: () => Pointer,
  Popup: () => Popup,
  SettingAppColorScheme: () => SettingAppColorScheme,
  SettingColorPicker: () => SettingColorPicker,
  SettingHomepageControl: () => SettingHomepageControl,
  ShelfSort: () => ShelfSort,
  ShortcutInput: () => ShortcutInput,
  Shortcuts: () => Shortcuts,
  SortRuleManager: () => SortRuleManager,
  SortableList: () => SortableList,
  SubmitOnChange: () => SubmitOnChange,
  Tabs: () => Tabs,
  TagManager: () => TagManager,
  TemplateManager: () => TemplateManager,
  ToggleSwitch: () => ToggleSwitch,
  TriLayout: () => TriLayout,
  UserSelect: () => UserSelect,
  WebhookEvents: () => WebhookEvents,
  WysiwygEditor: () => WysiwygEditor,
  WysiwygEditorTinymce: () => WysiwygEditorTinymce,
  WysiwygInput: () => WysiwygInput
});

// resources/js/services/util.ts
function debounce(func, waitMs, immediate) {
  let timeout = null;
  return function debouncedWrapper(...args) {
    const context = this;
    const later = function debouncedTimeout() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, waitMs);
    if (callNow) func.apply(context, args);
  };
}
function isDetailsElement(element) {
  return element.nodeName === "DETAILS";
}
function scrollAndHighlightElement(element) {
  if (!element) return;
  let parent = element;
  while (parent.parentElement) {
    parent = parent.parentElement;
    if (isDetailsElement(parent) && !parent.open) {
      parent.open = true;
    }
  }
  element.scrollIntoView({ behavior: "smooth" });
  const highlight = getComputedStyle(document.body).getPropertyValue("--color-link");
  element.style.outline = `2px dashed ${highlight}`;
  element.style.outlineOffset = "5px";
  element.style.removeProperty("transition");
  setTimeout(() => {
    element.style.transition = "outline linear 3s";
    element.style.outline = "2px dashed rgba(0, 0, 0, 0)";
    const listener = () => {
      element.removeEventListener("transitionend", listener);
      element.style.removeProperty("transition");
      element.style.removeProperty("outline");
      element.style.removeProperty("outlineOffset");
    };
    element.addEventListener("transitionend", listener);
  }, 1e3);
}
function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function uniqueId() {
  const S4 = () => ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
  return `${S4() + S4()}-${S4()}-${S4()}-${S4()}-${S4()}${S4()}${S4()}`;
}
function wait(timeMs) {
  return new Promise((res) => {
    setTimeout(res, timeMs);
  });
}
function baseUrl(path) {
  let targetPath = path;
  const baseUrlMeta = document.querySelector('meta[name="base-url"]');
  if (!baseUrlMeta) {
    throw new Error("Could not find expected base-url meta tag in document");
  }
  let basePath = baseUrlMeta.getAttribute("content") || "";
  if (basePath[basePath.length - 1] === "/") {
    basePath = basePath.slice(0, basePath.length - 1);
  }
  if (targetPath[0] === "/") {
    targetPath = targetPath.slice(1);
  }
  return `${basePath}/${targetPath}`;
}
function getVersion() {
  const styleLink = document.querySelector('link[href*="/dist/styles.css?version="]');
  if (!styleLink) {
    throw new Error("Could not find expected style link in document for version use");
  }
  const href = styleLink.getAttribute("href") || "";
  return href.split("?version=").pop() || "";
}
function importVersioned(moduleName) {
  const importPath = window.baseUrl(`dist/${moduleName}.js?version=${getVersion()}`);
  return import(importPath);
}
function cyrb53(str, seed = 0) {
  let h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507);
  h1 ^= Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507);
  h2 ^= Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return String(4294967296 * (2097151 & h2) + (h1 >>> 0));
}

// resources/js/services/dom.ts
function isHTMLElement(el2) {
  return el2 instanceof HTMLElement;
}
function elem(tagName, attrs = {}, children = []) {
  const el2 = document.createElement(tagName);
  for (const [key, val] of Object.entries(attrs)) {
    if (val === null) {
      el2.removeAttribute(key);
    } else {
      el2.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      el2.append(document.createTextNode(child));
    } else {
      el2.append(child);
    }
  }
  return el2;
}
function forEach(selector, callback) {
  const elements = document.querySelectorAll(selector);
  for (const element of elements) {
    callback(element);
  }
}
function onEvents(listenerElement, events, callback) {
  if (listenerElement) {
    for (const eventName of events) {
      listenerElement.addEventListener(eventName, callback);
    }
  }
}
function onSelect(elements, callback) {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }
  for (const listenerElement of elements) {
    listenerElement.addEventListener("click", callback);
    listenerElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        callback(event);
      }
    });
  }
}
function onKeyPress(key, elements, callback) {
  if (!Array.isArray(elements)) {
    elements = [elements];
  }
  const listener = (event) => {
    if (event.key === key) {
      callback(event);
    }
  };
  elements.forEach((e) => e.addEventListener("keydown", listener));
}
function onEnterPress(elements, callback) {
  onKeyPress("Enter", elements, callback);
}
function onEscapePress(elements, callback) {
  onKeyPress("Escape", elements, callback);
}
function onChildEvent(listenerElement, childSelector, eventName, callback) {
  listenerElement.addEventListener(eventName, (event) => {
    const matchingChild = event.target?.closest(childSelector);
    if (matchingChild) {
      callback.call(matchingChild, event, matchingChild);
    }
  });
}
function findText(selector, text) {
  const elements = document.querySelectorAll(selector);
  text = text.toLowerCase();
  for (const element of elements) {
    if ((element.textContent || "").toLowerCase().includes(text) && isHTMLElement(element)) {
      return element;
    }
  }
  return null;
}
function showLoading(element) {
  element.innerHTML = '<div class="loading-container"><div></div><div></div><div></div></div>';
}
function getLoading() {
  const wrap2 = document.createElement("div");
  wrap2.classList.add("loading-container");
  wrap2.innerHTML = "<div></div><div></div><div></div>";
  return wrap2;
}
function removeLoading(element) {
  const loadingEls = element.querySelectorAll(".loading-container");
  for (const el2 of loadingEls) {
    el2.remove();
  }
}
function htmlToDom(html) {
  const wrap2 = document.createElement("div");
  wrap2.innerHTML = html;
  window.$components.init(wrap2);
  const firstChild = wrap2.children[0];
  if (!isHTMLElement(firstChild)) {
    throw new Error("Could not find child HTMLElement when creating DOM element from HTML");
  }
  return firstChild;
}
function normalizeNodeTextOffsetToParent(node, offset, parentElement) {
  if (!parentElement.contains(node)) {
    throw new Error("ParentElement must be a prent of element");
  }
  let normalizedOffset = offset;
  let currentNode2 = node.nodeType === Node.TEXT_NODE ? node : node.childNodes[offset];
  while (currentNode2 !== parentElement && currentNode2) {
    if (currentNode2.previousSibling) {
      currentNode2 = currentNode2.previousSibling;
      normalizedOffset += currentNode2.textContent?.length || 0;
    } else {
      currentNode2 = currentNode2.parentNode;
    }
  }
  return normalizedOffset;
}
function findTargetNodeAndOffset(parentNode, offset) {
  if (offset === 0) {
    return { node: parentNode, offset: 0 };
  }
  let currentOffset = 0;
  let currentNode2 = null;
  for (let i = 0; i < parentNode.childNodes.length; i++) {
    currentNode2 = parentNode.childNodes[i];
    if (currentNode2.nodeType === Node.TEXT_NODE) {
      const textLength = (currentNode2.textContent || "").length;
      if (currentOffset + textLength >= offset) {
        return {
          node: currentNode2,
          offset: offset - currentOffset
        };
      }
      currentOffset += textLength;
    } else if (currentNode2.nodeType === Node.ELEMENT_NODE) {
      const elementTextLength = (currentNode2.textContent || "").length;
      if (currentOffset + elementTextLength >= offset) {
        return findTargetNodeAndOffset(currentNode2, offset - currentOffset);
      }
      currentOffset += elementTextLength;
    }
  }
  return null;
}
function hashElement(element) {
  const normalisedElemText = (element.textContent || "").replace(/\s{2,}/g, "");
  return cyrb53(normalisedElemText);
}
function findClosestScrollContainer(start) {
  let el2 = start;
  do {
    const computed = window.getComputedStyle(el2);
    if (computed.overflowY === "scroll") {
      return el2;
    }
    el2 = el2.parentElement;
  } while (el2);
  return document.body;
}

// resources/js/components/component.js
var Component = class {
  constructor() {
    /**
     * The registered name of the component.
     * @type {string}
     */
    __publicField(this, "$name", "");
    /**
     * The element that the component is registered upon.
     * @type {HTMLElement}
     */
    __publicField(this, "$el", null);
    /**
     * Mapping of referenced elements within the component.
     * @type {Object<string, HTMLElement>}
     */
    __publicField(this, "$refs", {});
    /**
     * Mapping of arrays of referenced elements within the component so multiple
     * references, sharing the same name, can be fetched.
     * @type {Object<string, HTMLElement[]>}
     */
    __publicField(this, "$manyRefs", {});
    /**
     * Options passed into this component.
     * @type {Object<String, String>}
     */
    __publicField(this, "$opts", {});
  }
  /**
   * Component-specific setup methods.
   * Use this to assign local variables and run any initial setup or actions.
   */
  setup() {
  }
  /**
   * Emit an event from this component.
   * Will be bubbled up from the dom element this is registered on, as a custom event
   * with the name `<elementName>-<eventName>`, with the provided data in the event detail.
   * @param {String} eventName
   * @param {Object} data
   */
  $emit(eventName, data = {}) {
    data.from = this;
    const componentName = this.$name;
    const event = new CustomEvent(`${componentName}-${eventName}`, {
      bubbles: true,
      detail: data
    });
    this.$el.dispatchEvent(event);
  }
};

// resources/js/components/add-remove-rows.js
var AddRemoveRows = class extends Component {
  setup() {
    this.modelRow = this.$refs.model;
    this.addButton = this.$refs.add;
    this.removeSelector = this.$opts.removeSelector;
    this.rowSelector = this.$opts.rowSelector;
    this.setupListeners();
  }
  setupListeners() {
    this.addButton.addEventListener("click", this.add.bind(this));
    onChildEvent(this.$el, this.removeSelector, "click", (e) => {
      const row = e.target.closest(this.rowSelector);
      row.remove();
    });
  }
  // For external use
  add() {
    const clone2 = this.modelRow.cloneNode(true);
    clone2.classList.remove("hidden");
    this.setClonedInputNames(clone2);
    this.modelRow.parentNode.insertBefore(clone2, this.modelRow);
    window.$components.init(clone2);
  }
  /**
   * Update the HTML names of a clone to be unique if required.
   * Names can use placeholder values. For exmaple, a model row
   * may have name="tags[randrowid][name]".
   * These are the available placeholder values:
   * - randrowid - An random string ID, applied the same across the row.
   * @param {HTMLElement} clone
   */
  setClonedInputNames(clone2) {
    const rowId = uniqueId();
    const randRowIdElems = clone2.querySelectorAll('[name*="randrowid"]');
    for (const elem2 of randRowIdElems) {
      elem2.name = elem2.name.split("randrowid").join(rowId);
    }
  }
};

// resources/js/components/ajax-delete-row.ts
var AjaxDeleteRow = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "row");
    __publicField(this, "url");
    __publicField(this, "deleteButtons", []);
  }
  setup() {
    this.row = this.$el;
    this.url = this.$opts.url;
    this.deleteButtons = this.$manyRefs.delete || [];
    onSelect(this.deleteButtons, this.runDelete.bind(this));
  }
  runDelete() {
    this.row.style.opacity = "0.7";
    this.row.style.pointerEvents = "none";
    window.$http.delete(this.url).then((resp) => {
      if (typeof resp.data === "object" && resp.data.message) {
        window.$events.emit("success", resp.data.message);
      }
      this.row.remove();
    }).catch(() => {
      this.row.style.removeProperty("opacity");
      this.row.style.removeProperty("pointer-events");
    });
  }
};

// resources/js/components/ajax-form.js
var AjaxForm = class extends Component {
  setup() {
    this.container = this.$el;
    this.responseContainer = this.container;
    this.url = this.$opts.url;
    this.method = this.$opts.method || "post";
    this.successMessage = this.$opts.successMessage;
    this.submitButtons = this.$manyRefs.submit || [];
    if (this.$opts.responseContainer) {
      this.responseContainer = this.container.closest(this.$opts.responseContainer);
    }
    this.setupListeners();
  }
  setupListeners() {
    if (this.container.tagName === "FORM") {
      this.container.addEventListener("submit", this.submitRealForm.bind(this));
      return;
    }
    onEnterPress(this.container, (event) => {
      this.submitFakeForm();
      event.preventDefault();
    });
    this.submitButtons.forEach((button) => onSelect(button, this.submitFakeForm.bind(this)));
  }
  submitFakeForm() {
    const fd = new FormData();
    const inputs = this.container.querySelectorAll("[name]");
    for (const input of inputs) {
      fd.append(input.getAttribute("name"), input.value);
    }
    this.submit(fd);
  }
  submitRealForm(event) {
    event.preventDefault();
    const fd = new FormData(this.container);
    this.submit(fd);
  }
  async submit(formData) {
    this.responseContainer.style.opacity = "0.7";
    this.responseContainer.style.pointerEvents = "none";
    try {
      const resp = await window.$http[this.method.toLowerCase()](this.url, formData);
      this.$emit("success", { formData });
      this.responseContainer.innerHTML = resp.data;
      if (this.successMessage) {
        window.$events.emit("success", this.successMessage);
      }
    } catch (err) {
      this.responseContainer.innerHTML = err.data;
    }
    window.$components.init(this.responseContainer);
    this.responseContainer.style.opacity = null;
    this.responseContainer.style.pointerEvents = null;
  }
};

// resources/js/components/attachments.js
var Attachments = class extends Component {
  setup() {
    this.container = this.$el;
    this.pageId = this.$opts.pageId;
    this.editContainer = this.$refs.editContainer;
    this.listContainer = this.$refs.listContainer;
    this.linksContainer = this.$refs.linksContainer;
    this.listPanel = this.$refs.listPanel;
    this.attachLinkButton = this.$refs.attachLinkButton;
    this.setupListeners();
  }
  setupListeners() {
    const reloadListBound = this.reloadList.bind(this);
    this.container.addEventListener("dropzone-upload-success", reloadListBound);
    this.container.addEventListener("ajax-form-success", reloadListBound);
    this.container.addEventListener("sortable-list-sort", (event) => {
      this.updateOrder(event.detail.ids);
    });
    this.container.addEventListener("event-emit-select-edit", (event) => {
      this.startEdit(event.detail.id);
    });
    this.container.addEventListener("event-emit-select-edit-back", () => {
      this.stopEdit();
    });
    this.container.addEventListener("event-emit-select-insert", (event) => {
      const insertContent = event.target.closest("[data-drag-content]").getAttribute("data-drag-content");
      const contentTypes = JSON.parse(insertContent);
      window.$events.emit("editor::insert", {
        html: contentTypes["text/html"],
        markdown: contentTypes["text/plain"]
      });
    });
    this.attachLinkButton.addEventListener("click", () => {
      this.showSection("links");
    });
  }
  showSection(section) {
    const sectionMap = {
      links: this.linksContainer,
      edit: this.editContainer,
      list: this.listContainer
    };
    for (const [name, elem2] of Object.entries(sectionMap)) {
      elem2.toggleAttribute("hidden", name !== section);
    }
  }
  reloadList() {
    this.stopEdit();
    window.$http.get(`/attachments/get/page/${this.pageId}`).then((resp) => {
      this.listPanel.innerHTML = resp.data;
      window.$components.init(this.listPanel);
    });
  }
  updateOrder(idOrder) {
    window.$http.put(`/attachments/sort/page/${this.pageId}`, { order: idOrder }).then((resp) => {
      window.$events.emit("success", resp.data.message);
    });
  }
  async startEdit(id) {
    this.showSection("edit");
    showLoading(this.editContainer);
    const resp = await window.$http.get(`/attachments/edit/${id}`);
    this.editContainer.innerHTML = resp.data;
    window.$components.init(this.editContainer);
  }
  stopEdit() {
    this.showSection("list");
  }
};

// resources/js/components/attachments-list.js
var AttachmentsList = class extends Component {
  setup() {
    this.container = this.$el;
    this.fileLinks = this.$manyRefs.linkTypeFile;
    this.setupListeners();
  }
  setupListeners() {
    const isExpectedKey = (event) => event.key === "Control" || event.key === "Meta";
    window.addEventListener("keydown", (event) => {
      if (isExpectedKey(event)) {
        this.addOpenQueryToLinks();
      }
    }, { passive: true });
    window.addEventListener("keyup", (event) => {
      if (isExpectedKey(event)) {
        this.removeOpenQueryFromLinks();
      }
    }, { passive: true });
  }
  addOpenQueryToLinks() {
    for (const link of this.fileLinks) {
      if (link.href.split("?")[1] !== "open=true") {
        link.href += "?open=true";
        link.setAttribute("target", "_blank");
      }
    }
  }
  removeOpenQueryFromLinks() {
    for (const link of this.fileLinks) {
      link.href = link.href.split("?")[0];
      link.removeAttribute("target");
    }
  }
};

// resources/js/services/keyboard-navigation.ts
var _KeyboardNavigationHandler_instances, keydownHandler_fn, getFocusable_fn;
var KeyboardNavigationHandler = class {
  constructor(container, onEscape = null, onEnter = null) {
    __privateAdd(this, _KeyboardNavigationHandler_instances);
    __publicField(this, "containers");
    __publicField(this, "onEscape");
    __publicField(this, "onEnter");
    this.containers = [container];
    this.onEscape = onEscape;
    this.onEnter = onEnter;
    container.addEventListener("keydown", __privateMethod(this, _KeyboardNavigationHandler_instances, keydownHandler_fn).bind(this));
  }
  /**
   * Also share the keyboard event handling to the given element.
   * Only elements within the original container are considered focusable though.
   */
  shareHandlingToEl(element) {
    this.containers.push(element);
    element.addEventListener("keydown", __privateMethod(this, _KeyboardNavigationHandler_instances, keydownHandler_fn).bind(this));
  }
  /**
   * Focus on the next focusable element within the current containers.
   */
  focusNext() {
    const focusable = __privateMethod(this, _KeyboardNavigationHandler_instances, getFocusable_fn).call(this);
    const activeEl = document.activeElement;
    const currentIndex = isHTMLElement(activeEl) ? focusable.indexOf(activeEl) : -1;
    let newIndex2 = currentIndex + 1;
    if (newIndex2 >= focusable.length) {
      newIndex2 = 0;
    }
    focusable[newIndex2].focus();
  }
  /**
   * Focus on the previous existing focusable element within the current containers.
   */
  focusPrevious() {
    const focusable = __privateMethod(this, _KeyboardNavigationHandler_instances, getFocusable_fn).call(this);
    const activeEl = document.activeElement;
    const currentIndex = isHTMLElement(activeEl) ? focusable.indexOf(activeEl) : -1;
    let newIndex2 = currentIndex - 1;
    if (newIndex2 < 0) {
      newIndex2 = focusable.length - 1;
    }
    focusable[newIndex2].focus();
  }
};
_KeyboardNavigationHandler_instances = new WeakSet();
keydownHandler_fn = function(event) {
  if (isHTMLElement(event.target) && event.target.matches("input") && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    this.focusNext();
    event.preventDefault();
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    this.focusPrevious();
    event.preventDefault();
  } else if (event.key === "Escape") {
    if (this.onEscape) {
      this.onEscape(event);
    } else if (isHTMLElement(document.activeElement)) {
      document.activeElement.blur();
    }
  } else if (event.key === "Enter" && this.onEnter) {
    this.onEnter(event);
  }
};
/**
 * Get an array of focusable elements within the current containers.
 */
getFocusable_fn = function() {
  const focusable = [];
  const selector = '[tabindex]:not([tabindex="-1"]),[href],button:not([tabindex="-1"],[disabled]),input:not([type=hidden])';
  for (const container of this.containers) {
    const toAdd = [...container.querySelectorAll(selector)].filter((e) => isHTMLElement(e));
    focusable.push(...toAdd);
  }
  return focusable;
};

// resources/js/components/auto-suggest.js
var ajaxCache = {};
var AutoSuggest = class extends Component {
  setup() {
    this.parent = this.$el.parentElement;
    this.container = this.$el;
    this.type = this.$opts.type;
    this.url = this.$opts.url;
    this.input = this.$refs.input;
    this.list = this.$refs.list;
    this.lastPopulated = 0;
    this.setupListeners();
  }
  setupListeners() {
    const navHandler = new KeyboardNavigationHandler(
      this.list,
      () => {
        this.input.focus();
        setTimeout(() => this.hideSuggestions(), 1);
      },
      (event) => {
        event.preventDefault();
        const selectionValue = event.target.textContent;
        if (selectionValue) {
          this.selectSuggestion(selectionValue);
        }
      }
    );
    navHandler.shareHandlingToEl(this.input);
    onChildEvent(this.list, ".text-item", "click", (event, el2) => {
      this.selectSuggestion(el2.textContent);
    });
    this.input.addEventListener("input", this.requestSuggestions.bind(this));
    this.input.addEventListener("focus", this.requestSuggestions.bind(this));
    this.input.addEventListener("blur", this.hideSuggestionsIfFocusedLost.bind(this));
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        this.hideSuggestions();
      }
    });
  }
  selectSuggestion(value) {
    this.input.value = value;
    this.lastPopulated = Date.now();
    this.input.focus();
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
    this.input.dispatchEvent(new Event("change", { bubbles: true }));
    this.hideSuggestions();
  }
  async requestSuggestions() {
    if (Date.now() - this.lastPopulated < 50) {
      return;
    }
    const nameFilter = this.getNameFilterIfNeeded();
    const search = this.input.value.toLowerCase();
    const suggestions = await this.loadSuggestions(search, nameFilter);
    const toShow = suggestions.filter((val) => search === "" || val.toLowerCase().startsWith(search)).slice(0, 10);
    this.displaySuggestions(toShow);
  }
  getNameFilterIfNeeded() {
    if (this.type !== "value") return null;
    return this.parent.querySelector("input").value;
  }
  /**
   * @param {String} search
   * @param {String|null} nameFilter
   * @returns {Promise<Object|String|*>}
   */
  async loadSuggestions(search, nameFilter = null) {
    search = search.slice(0, 4);
    const params = { search, name: nameFilter };
    const cacheKey = `${this.url}:${JSON.stringify(params)}`;
    if (ajaxCache[cacheKey]) {
      return ajaxCache[cacheKey];
    }
    const resp = await window.$http.get(this.url, params);
    ajaxCache[cacheKey] = resp.data;
    return resp.data;
  }
  /**
   * @param {String[]} suggestions
   */
  displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    this.list.innerHTML = suggestions.map((value) => `<li><div tabindex="0" class="text-item">${escapeHtml(value)}</div></li>`).join("");
    this.list.style.display = "block";
    for (const button of this.list.querySelectorAll(".text-item")) {
      button.addEventListener("blur", this.hideSuggestionsIfFocusedLost.bind(this));
    }
  }
  hideSuggestions() {
    this.list.style.display = "none";
  }
  hideSuggestionsIfFocusedLost(event) {
    if (!this.container.contains(event.relatedTarget)) {
      this.hideSuggestions();
    }
  }
};

// resources/js/components/auto-submit.js
var AutoSubmit = class extends Component {
  setup() {
    this.form = this.$el;
    this.form.submit();
  }
};

// resources/js/components/back-to-top.js
var BackToTop = class extends Component {
  setup() {
    this.button = this.$el;
    this.targetElem = document.getElementById("header");
    this.showing = false;
    this.breakPoint = 1200;
    if (document.body.classList.contains("flexbox")) {
      this.button.style.display = "none";
      return;
    }
    this.button.addEventListener("click", this.scrollToTop.bind(this));
    window.addEventListener("scroll", this.onPageScroll.bind(this));
  }
  onPageScroll() {
    const scrollTopPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (!this.showing && scrollTopPos > this.breakPoint) {
      this.button.style.display = "block";
      this.showing = true;
      setTimeout(() => {
        this.button.style.opacity = 0.4;
      }, 1);
    } else if (this.showing && scrollTopPos < this.breakPoint) {
      this.button.style.opacity = 0;
      this.showing = false;
      setTimeout(() => {
        this.button.style.display = "none";
      }, 500);
    }
  }
  scrollToTop() {
    const targetTop = this.targetElem.getBoundingClientRect().top;
    const scrollElem = document.documentElement.scrollTop ? document.documentElement : document.body;
    const duration = 300;
    const start = Date.now();
    const scrollStart = this.targetElem.getBoundingClientRect().top;
    function setPos() {
      const percentComplete = 1 - (Date.now() - start) / duration;
      const target = Math.abs(percentComplete * scrollStart);
      if (percentComplete > 0) {
        scrollElem.scrollTop = target;
        requestAnimationFrame(setPos.bind(this));
      } else {
        scrollElem.scrollTop = targetTop;
      }
    }
    requestAnimationFrame(setPos.bind(this));
  }
};

// node_modules/sortablejs/modular/sortable.esm.js
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function(sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function(key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function(key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }
  return target;
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
var version = "1.15.6";
function userAgent(pattern) {
  if (typeof window !== "undefined" && window.navigator) {
    return !!/* @__PURE__ */ navigator.userAgent.match(pattern);
  }
}
var IE11OrLess = userAgent(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i);
var Edge = userAgent(/Edge/i);
var FireFox = userAgent(/firefox/i);
var Safari = userAgent(/safari/i) && !userAgent(/chrome/i) && !userAgent(/android/i);
var IOS = userAgent(/iP(ad|od|hone)/i);
var ChromeForAndroid = userAgent(/chrome/i) && userAgent(/android/i);
var captureMode = {
  capture: false,
  passive: false
};
function on(el2, event, fn) {
  el2.addEventListener(event, fn, !IE11OrLess && captureMode);
}
function off(el2, event, fn) {
  el2.removeEventListener(event, fn, !IE11OrLess && captureMode);
}
function matches(el2, selector) {
  if (!selector) return;
  selector[0] === ">" && (selector = selector.substring(1));
  if (el2) {
    try {
      if (el2.matches) {
        return el2.matches(selector);
      } else if (el2.msMatchesSelector) {
        return el2.msMatchesSelector(selector);
      } else if (el2.webkitMatchesSelector) {
        return el2.webkitMatchesSelector(selector);
      }
    } catch (_) {
      return false;
    }
  }
  return false;
}
function getParentOrHost(el2) {
  return el2.host && el2 !== document && el2.host.nodeType ? el2.host : el2.parentNode;
}
function closest(el2, selector, ctx, includeCTX) {
  if (el2) {
    ctx = ctx || document;
    do {
      if (selector != null && (selector[0] === ">" ? el2.parentNode === ctx && matches(el2, selector) : matches(el2, selector)) || includeCTX && el2 === ctx) {
        return el2;
      }
      if (el2 === ctx) break;
    } while (el2 = getParentOrHost(el2));
  }
  return null;
}
var R_SPACE = /\s+/g;
function toggleClass(el2, name, state) {
  if (el2 && name) {
    if (el2.classList) {
      el2.classList[state ? "add" : "remove"](name);
    } else {
      var className = (" " + el2.className + " ").replace(R_SPACE, " ").replace(" " + name + " ", " ");
      el2.className = (className + (state ? " " + name : "")).replace(R_SPACE, " ");
    }
  }
}
function css(el2, prop, val) {
  var style = el2 && el2.style;
  if (style) {
    if (val === void 0) {
      if (document.defaultView && document.defaultView.getComputedStyle) {
        val = document.defaultView.getComputedStyle(el2, "");
      } else if (el2.currentStyle) {
        val = el2.currentStyle;
      }
      return prop === void 0 ? val : val[prop];
    } else {
      if (!(prop in style) && prop.indexOf("webkit") === -1) {
        prop = "-webkit-" + prop;
      }
      style[prop] = val + (typeof val === "string" ? "" : "px");
    }
  }
}
function matrix(el2, selfOnly) {
  var appliedTransforms = "";
  if (typeof el2 === "string") {
    appliedTransforms = el2;
  } else {
    do {
      var transform = css(el2, "transform");
      if (transform && transform !== "none") {
        appliedTransforms = transform + " " + appliedTransforms;
      }
    } while (!selfOnly && (el2 = el2.parentNode));
  }
  var matrixFn = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
  return matrixFn && new matrixFn(appliedTransforms);
}
function find(ctx, tagName, iterator) {
  if (ctx) {
    var list = ctx.getElementsByTagName(tagName), i = 0, n = list.length;
    if (iterator) {
      for (; i < n; i++) {
        iterator(list[i], i);
      }
    }
    return list;
  }
  return [];
}
function getWindowScrollingElement() {
  var scrollingElement = document.scrollingElement;
  if (scrollingElement) {
    return scrollingElement;
  } else {
    return document.documentElement;
  }
}
function getRect(el2, relativeToContainingBlock, relativeToNonStaticParent, undoScale, container) {
  if (!el2.getBoundingClientRect && el2 !== window) return;
  var elRect, top, left, bottom, right, height, width;
  if (el2 !== window && el2.parentNode && el2 !== getWindowScrollingElement()) {
    elRect = el2.getBoundingClientRect();
    top = elRect.top;
    left = elRect.left;
    bottom = elRect.bottom;
    right = elRect.right;
    height = elRect.height;
    width = elRect.width;
  } else {
    top = 0;
    left = 0;
    bottom = window.innerHeight;
    right = window.innerWidth;
    height = window.innerHeight;
    width = window.innerWidth;
  }
  if ((relativeToContainingBlock || relativeToNonStaticParent) && el2 !== window) {
    container = container || el2.parentNode;
    if (!IE11OrLess) {
      do {
        if (container && container.getBoundingClientRect && (css(container, "transform") !== "none" || relativeToNonStaticParent && css(container, "position") !== "static")) {
          var containerRect = container.getBoundingClientRect();
          top -= containerRect.top + parseInt(css(container, "border-top-width"));
          left -= containerRect.left + parseInt(css(container, "border-left-width"));
          bottom = top + elRect.height;
          right = left + elRect.width;
          break;
        }
      } while (container = container.parentNode);
    }
  }
  if (undoScale && el2 !== window) {
    var elMatrix = matrix(container || el2), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d;
    if (elMatrix) {
      top /= scaleY;
      left /= scaleX;
      width /= scaleX;
      height /= scaleY;
      bottom = top + height;
      right = left + width;
    }
  }
  return {
    top,
    left,
    bottom,
    right,
    width,
    height
  };
}
function isScrolledPast(el2, elSide, parentSide) {
  var parent = getParentAutoScrollElement(el2, true), elSideVal = getRect(el2)[elSide];
  while (parent) {
    var parentSideVal = getRect(parent)[parentSide], visible = void 0;
    if (parentSide === "top" || parentSide === "left") {
      visible = elSideVal >= parentSideVal;
    } else {
      visible = elSideVal <= parentSideVal;
    }
    if (!visible) return parent;
    if (parent === getWindowScrollingElement()) break;
    parent = getParentAutoScrollElement(parent, false);
  }
  return false;
}
function getChild(el2, childNum, options2, includeDragEl) {
  var currentChild = 0, i = 0, children = el2.children;
  while (i < children.length) {
    if (children[i].style.display !== "none" && children[i] !== Sortable.ghost && (includeDragEl || children[i] !== Sortable.dragged) && closest(children[i], options2.draggable, el2, false)) {
      if (currentChild === childNum) {
        return children[i];
      }
      currentChild++;
    }
    i++;
  }
  return null;
}
function lastChild(el2, selector) {
  var last = el2.lastElementChild;
  while (last && (last === Sortable.ghost || css(last, "display") === "none" || selector && !matches(last, selector))) {
    last = last.previousElementSibling;
  }
  return last || null;
}
function index(el2, selector) {
  var index2 = 0;
  if (!el2 || !el2.parentNode) {
    return -1;
  }
  while (el2 = el2.previousElementSibling) {
    if (el2.nodeName.toUpperCase() !== "TEMPLATE" && el2 !== Sortable.clone && (!selector || matches(el2, selector))) {
      index2++;
    }
  }
  return index2;
}
function getRelativeScrollOffset(el2) {
  var offsetLeft = 0, offsetTop = 0, winScroller = getWindowScrollingElement();
  if (el2) {
    do {
      var elMatrix = matrix(el2), scaleX = elMatrix.a, scaleY = elMatrix.d;
      offsetLeft += el2.scrollLeft * scaleX;
      offsetTop += el2.scrollTop * scaleY;
    } while (el2 !== winScroller && (el2 = el2.parentNode));
  }
  return [offsetLeft, offsetTop];
}
function indexOfObject(arr, obj) {
  for (var i in arr) {
    if (!arr.hasOwnProperty(i)) continue;
    for (var key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] === arr[i][key]) return Number(i);
    }
  }
  return -1;
}
function getParentAutoScrollElement(el2, includeSelf) {
  if (!el2 || !el2.getBoundingClientRect) return getWindowScrollingElement();
  var elem2 = el2;
  var gotSelf = false;
  do {
    if (elem2.clientWidth < elem2.scrollWidth || elem2.clientHeight < elem2.scrollHeight) {
      var elemCSS = css(elem2);
      if (elem2.clientWidth < elem2.scrollWidth && (elemCSS.overflowX == "auto" || elemCSS.overflowX == "scroll") || elem2.clientHeight < elem2.scrollHeight && (elemCSS.overflowY == "auto" || elemCSS.overflowY == "scroll")) {
        if (!elem2.getBoundingClientRect || elem2 === document.body) return getWindowScrollingElement();
        if (gotSelf || includeSelf) return elem2;
        gotSelf = true;
      }
    }
  } while (elem2 = elem2.parentNode);
  return getWindowScrollingElement();
}
function extend(dst, src) {
  if (dst && src) {
    for (var key in src) {
      if (src.hasOwnProperty(key)) {
        dst[key] = src[key];
      }
    }
  }
  return dst;
}
function isRectEqual(rect1, rect2) {
  return Math.round(rect1.top) === Math.round(rect2.top) && Math.round(rect1.left) === Math.round(rect2.left) && Math.round(rect1.height) === Math.round(rect2.height) && Math.round(rect1.width) === Math.round(rect2.width);
}
var _throttleTimeout;
function throttle(callback, ms) {
  return function() {
    if (!_throttleTimeout) {
      var args = arguments, _this = this;
      if (args.length === 1) {
        callback.call(_this, args[0]);
      } else {
        callback.apply(_this, args);
      }
      _throttleTimeout = setTimeout(function() {
        _throttleTimeout = void 0;
      }, ms);
    }
  };
}
function cancelThrottle() {
  clearTimeout(_throttleTimeout);
  _throttleTimeout = void 0;
}
function scrollBy(el2, x, y) {
  el2.scrollLeft += x;
  el2.scrollTop += y;
}
function clone(el2) {
  var Polymer = window.Polymer;
  var $ = window.jQuery || window.Zepto;
  if (Polymer && Polymer.dom) {
    return Polymer.dom(el2).cloneNode(true);
  } else if ($) {
    return $(el2).clone(true)[0];
  } else {
    return el2.cloneNode(true);
  }
}
function setRect(el2, rect) {
  css(el2, "position", "absolute");
  css(el2, "top", rect.top);
  css(el2, "left", rect.left);
  css(el2, "width", rect.width);
  css(el2, "height", rect.height);
}
function unsetRect(el2) {
  css(el2, "position", "");
  css(el2, "top", "");
  css(el2, "left", "");
  css(el2, "width", "");
  css(el2, "height", "");
}
function getChildContainingRectFromElement(container, options2, ghostEl2) {
  var rect = {};
  Array.from(container.children).forEach(function(child) {
    var _rect$left, _rect$top, _rect$right, _rect$bottom;
    if (!closest(child, options2.draggable, container, false) || child.animated || child === ghostEl2) return;
    var childRect = getRect(child);
    rect.left = Math.min((_rect$left = rect.left) !== null && _rect$left !== void 0 ? _rect$left : Infinity, childRect.left);
    rect.top = Math.min((_rect$top = rect.top) !== null && _rect$top !== void 0 ? _rect$top : Infinity, childRect.top);
    rect.right = Math.max((_rect$right = rect.right) !== null && _rect$right !== void 0 ? _rect$right : -Infinity, childRect.right);
    rect.bottom = Math.max((_rect$bottom = rect.bottom) !== null && _rect$bottom !== void 0 ? _rect$bottom : -Infinity, childRect.bottom);
  });
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;
  rect.x = rect.left;
  rect.y = rect.top;
  return rect;
}
var expando = "Sortable" + (/* @__PURE__ */ new Date()).getTime();
function AnimationStateManager() {
  var animationStates = [], animationCallbackId;
  return {
    captureAnimationState: function captureAnimationState() {
      animationStates = [];
      if (!this.options.animation) return;
      var children = [].slice.call(this.el.children);
      children.forEach(function(child) {
        if (css(child, "display") === "none" || child === Sortable.ghost) return;
        animationStates.push({
          target: child,
          rect: getRect(child)
        });
        var fromRect = _objectSpread2({}, animationStates[animationStates.length - 1].rect);
        if (child.thisAnimationDuration) {
          var childMatrix = matrix(child, true);
          if (childMatrix) {
            fromRect.top -= childMatrix.f;
            fromRect.left -= childMatrix.e;
          }
        }
        child.fromRect = fromRect;
      });
    },
    addAnimationState: function addAnimationState(state) {
      animationStates.push(state);
    },
    removeAnimationState: function removeAnimationState(target) {
      animationStates.splice(indexOfObject(animationStates, {
        target
      }), 1);
    },
    animateAll: function animateAll(callback) {
      var _this = this;
      if (!this.options.animation) {
        clearTimeout(animationCallbackId);
        if (typeof callback === "function") callback();
        return;
      }
      var animating = false, animationTime = 0;
      animationStates.forEach(function(state) {
        var time = 0, target = state.target, fromRect = target.fromRect, toRect = getRect(target), prevFromRect = target.prevFromRect, prevToRect = target.prevToRect, animatingRect = state.rect, targetMatrix = matrix(target, true);
        if (targetMatrix) {
          toRect.top -= targetMatrix.f;
          toRect.left -= targetMatrix.e;
        }
        target.toRect = toRect;
        if (target.thisAnimationDuration) {
          if (isRectEqual(prevFromRect, toRect) && !isRectEqual(fromRect, toRect) && // Make sure animatingRect is on line between toRect & fromRect
          (animatingRect.top - toRect.top) / (animatingRect.left - toRect.left) === (fromRect.top - toRect.top) / (fromRect.left - toRect.left)) {
            time = calculateRealTime(animatingRect, prevFromRect, prevToRect, _this.options);
          }
        }
        if (!isRectEqual(toRect, fromRect)) {
          target.prevFromRect = fromRect;
          target.prevToRect = toRect;
          if (!time) {
            time = _this.options.animation;
          }
          _this.animate(target, animatingRect, toRect, time);
        }
        if (time) {
          animating = true;
          animationTime = Math.max(animationTime, time);
          clearTimeout(target.animationResetTimer);
          target.animationResetTimer = setTimeout(function() {
            target.animationTime = 0;
            target.prevFromRect = null;
            target.fromRect = null;
            target.prevToRect = null;
            target.thisAnimationDuration = null;
          }, time);
          target.thisAnimationDuration = time;
        }
      });
      clearTimeout(animationCallbackId);
      if (!animating) {
        if (typeof callback === "function") callback();
      } else {
        animationCallbackId = setTimeout(function() {
          if (typeof callback === "function") callback();
        }, animationTime);
      }
      animationStates = [];
    },
    animate: function animate(target, currentRect, toRect, duration) {
      if (duration) {
        css(target, "transition", "");
        css(target, "transform", "");
        var elMatrix = matrix(this.el), scaleX = elMatrix && elMatrix.a, scaleY = elMatrix && elMatrix.d, translateX = (currentRect.left - toRect.left) / (scaleX || 1), translateY = (currentRect.top - toRect.top) / (scaleY || 1);
        target.animatingX = !!translateX;
        target.animatingY = !!translateY;
        css(target, "transform", "translate3d(" + translateX + "px," + translateY + "px,0)");
        this.forRepaintDummy = repaint(target);
        css(target, "transition", "transform " + duration + "ms" + (this.options.easing ? " " + this.options.easing : ""));
        css(target, "transform", "translate3d(0,0,0)");
        typeof target.animated === "number" && clearTimeout(target.animated);
        target.animated = setTimeout(function() {
          css(target, "transition", "");
          css(target, "transform", "");
          target.animated = false;
          target.animatingX = false;
          target.animatingY = false;
        }, duration);
      }
    }
  };
}
function repaint(target) {
  return target.offsetWidth;
}
function calculateRealTime(animatingRect, fromRect, toRect, options2) {
  return Math.sqrt(Math.pow(fromRect.top - animatingRect.top, 2) + Math.pow(fromRect.left - animatingRect.left, 2)) / Math.sqrt(Math.pow(fromRect.top - toRect.top, 2) + Math.pow(fromRect.left - toRect.left, 2)) * options2.animation;
}
var plugins = [];
var defaults = {
  initializeByDefault: true
};
var PluginManager = {
  mount: function mount(plugin) {
    for (var option2 in defaults) {
      if (defaults.hasOwnProperty(option2) && !(option2 in plugin)) {
        plugin[option2] = defaults[option2];
      }
    }
    plugins.forEach(function(p) {
      if (p.pluginName === plugin.pluginName) {
        throw "Sortable: Cannot mount plugin ".concat(plugin.pluginName, " more than once");
      }
    });
    plugins.push(plugin);
  },
  pluginEvent: function pluginEvent(eventName, sortable, evt) {
    var _this = this;
    this.eventCanceled = false;
    evt.cancel = function() {
      _this.eventCanceled = true;
    };
    var eventNameGlobal = eventName + "Global";
    plugins.forEach(function(plugin) {
      if (!sortable[plugin.pluginName]) return;
      if (sortable[plugin.pluginName][eventNameGlobal]) {
        sortable[plugin.pluginName][eventNameGlobal](_objectSpread2({
          sortable
        }, evt));
      }
      if (sortable.options[plugin.pluginName] && sortable[plugin.pluginName][eventName]) {
        sortable[plugin.pluginName][eventName](_objectSpread2({
          sortable
        }, evt));
      }
    });
  },
  initializePlugins: function initializePlugins(sortable, el2, defaults2, options2) {
    plugins.forEach(function(plugin) {
      var pluginName = plugin.pluginName;
      if (!sortable.options[pluginName] && !plugin.initializeByDefault) return;
      var initialized = new plugin(sortable, el2, sortable.options);
      initialized.sortable = sortable;
      initialized.options = sortable.options;
      sortable[pluginName] = initialized;
      _extends(defaults2, initialized.defaults);
    });
    for (var option2 in sortable.options) {
      if (!sortable.options.hasOwnProperty(option2)) continue;
      var modified = this.modifyOption(sortable, option2, sortable.options[option2]);
      if (typeof modified !== "undefined") {
        sortable.options[option2] = modified;
      }
    }
  },
  getEventProperties: function getEventProperties(name, sortable) {
    var eventProperties = {};
    plugins.forEach(function(plugin) {
      if (typeof plugin.eventProperties !== "function") return;
      _extends(eventProperties, plugin.eventProperties.call(sortable[plugin.pluginName], name));
    });
    return eventProperties;
  },
  modifyOption: function modifyOption(sortable, name, value) {
    var modifiedValue;
    plugins.forEach(function(plugin) {
      if (!sortable[plugin.pluginName]) return;
      if (plugin.optionListeners && typeof plugin.optionListeners[name] === "function") {
        modifiedValue = plugin.optionListeners[name].call(sortable[plugin.pluginName], value);
      }
    });
    return modifiedValue;
  }
};
function dispatchEvent(_ref) {
  var sortable = _ref.sortable, rootEl2 = _ref.rootEl, name = _ref.name, targetEl = _ref.targetEl, cloneEl2 = _ref.cloneEl, toEl = _ref.toEl, fromEl = _ref.fromEl, oldIndex2 = _ref.oldIndex, newIndex2 = _ref.newIndex, oldDraggableIndex2 = _ref.oldDraggableIndex, newDraggableIndex2 = _ref.newDraggableIndex, originalEvent = _ref.originalEvent, putSortable2 = _ref.putSortable, extraEventProperties = _ref.extraEventProperties;
  sortable = sortable || rootEl2 && rootEl2[expando];
  if (!sortable) return;
  var evt, options2 = sortable.options, onName = "on" + name.charAt(0).toUpperCase() + name.substr(1);
  if (window.CustomEvent && !IE11OrLess && !Edge) {
    evt = new CustomEvent(name, {
      bubbles: true,
      cancelable: true
    });
  } else {
    evt = document.createEvent("Event");
    evt.initEvent(name, true, true);
  }
  evt.to = toEl || rootEl2;
  evt.from = fromEl || rootEl2;
  evt.item = targetEl || rootEl2;
  evt.clone = cloneEl2;
  evt.oldIndex = oldIndex2;
  evt.newIndex = newIndex2;
  evt.oldDraggableIndex = oldDraggableIndex2;
  evt.newDraggableIndex = newDraggableIndex2;
  evt.originalEvent = originalEvent;
  evt.pullMode = putSortable2 ? putSortable2.lastPutMode : void 0;
  var allEventProperties = _objectSpread2(_objectSpread2({}, extraEventProperties), PluginManager.getEventProperties(name, sortable));
  for (var option2 in allEventProperties) {
    evt[option2] = allEventProperties[option2];
  }
  if (rootEl2) {
    rootEl2.dispatchEvent(evt);
  }
  if (options2[onName]) {
    options2[onName].call(sortable, evt);
  }
}
var _excluded = ["evt"];
var pluginEvent2 = function pluginEvent3(eventName, sortable) {
  var _ref = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, originalEvent = _ref.evt, data = _objectWithoutProperties(_ref, _excluded);
  PluginManager.pluginEvent.bind(Sortable)(eventName, sortable, _objectSpread2({
    dragEl,
    parentEl,
    ghostEl,
    rootEl,
    nextEl,
    lastDownEl,
    cloneEl,
    cloneHidden,
    dragStarted: moved,
    putSortable,
    activeSortable: Sortable.active,
    originalEvent,
    oldIndex,
    oldDraggableIndex,
    newIndex,
    newDraggableIndex,
    hideGhostForTarget: _hideGhostForTarget,
    unhideGhostForTarget: _unhideGhostForTarget,
    cloneNowHidden: function cloneNowHidden() {
      cloneHidden = true;
    },
    cloneNowShown: function cloneNowShown() {
      cloneHidden = false;
    },
    dispatchSortableEvent: function dispatchSortableEvent(name) {
      _dispatchEvent({
        sortable,
        name,
        originalEvent
      });
    }
  }, data));
};
function _dispatchEvent(info) {
  dispatchEvent(_objectSpread2({
    putSortable,
    cloneEl,
    targetEl: dragEl,
    rootEl,
    oldIndex,
    oldDraggableIndex,
    newIndex,
    newDraggableIndex
  }, info));
}
var dragEl;
var parentEl;
var ghostEl;
var rootEl;
var nextEl;
var lastDownEl;
var cloneEl;
var cloneHidden;
var oldIndex;
var newIndex;
var oldDraggableIndex;
var newDraggableIndex;
var activeGroup;
var putSortable;
var awaitingDragStarted = false;
var ignoreNextClick = false;
var sortables = [];
var tapEvt;
var touchEvt;
var lastDx;
var lastDy;
var tapDistanceLeft;
var tapDistanceTop;
var moved;
var lastTarget;
var lastDirection;
var pastFirstInvertThresh = false;
var isCircumstantialInvert = false;
var targetMoveDistance;
var ghostRelativeParent;
var ghostRelativeParentInitialScroll = [];
var _silent = false;
var savedInputChecked = [];
var documentExists = typeof document !== "undefined";
var PositionGhostAbsolutely = IOS;
var CSSFloatProperty = Edge || IE11OrLess ? "cssFloat" : "float";
var supportDraggable = documentExists && !ChromeForAndroid && !IOS && "draggable" in document.createElement("div");
var supportCssPointerEvents = function() {
  if (!documentExists) return;
  if (IE11OrLess) {
    return false;
  }
  var el2 = document.createElement("x");
  el2.style.cssText = "pointer-events:auto";
  return el2.style.pointerEvents === "auto";
}();
var _detectDirection = function _detectDirection2(el2, options2) {
  var elCSS = css(el2), elWidth = parseInt(elCSS.width) - parseInt(elCSS.paddingLeft) - parseInt(elCSS.paddingRight) - parseInt(elCSS.borderLeftWidth) - parseInt(elCSS.borderRightWidth), child1 = getChild(el2, 0, options2), child2 = getChild(el2, 1, options2), firstChildCSS = child1 && css(child1), secondChildCSS = child2 && css(child2), firstChildWidth = firstChildCSS && parseInt(firstChildCSS.marginLeft) + parseInt(firstChildCSS.marginRight) + getRect(child1).width, secondChildWidth = secondChildCSS && parseInt(secondChildCSS.marginLeft) + parseInt(secondChildCSS.marginRight) + getRect(child2).width;
  if (elCSS.display === "flex") {
    return elCSS.flexDirection === "column" || elCSS.flexDirection === "column-reverse" ? "vertical" : "horizontal";
  }
  if (elCSS.display === "grid") {
    return elCSS.gridTemplateColumns.split(" ").length <= 1 ? "vertical" : "horizontal";
  }
  if (child1 && firstChildCSS["float"] && firstChildCSS["float"] !== "none") {
    var touchingSideChild2 = firstChildCSS["float"] === "left" ? "left" : "right";
    return child2 && (secondChildCSS.clear === "both" || secondChildCSS.clear === touchingSideChild2) ? "vertical" : "horizontal";
  }
  return child1 && (firstChildCSS.display === "block" || firstChildCSS.display === "flex" || firstChildCSS.display === "table" || firstChildCSS.display === "grid" || firstChildWidth >= elWidth && elCSS[CSSFloatProperty] === "none" || child2 && elCSS[CSSFloatProperty] === "none" && firstChildWidth + secondChildWidth > elWidth) ? "vertical" : "horizontal";
};
var _dragElInRowColumn = function _dragElInRowColumn2(dragRect, targetRect, vertical) {
  var dragElS1Opp = vertical ? dragRect.left : dragRect.top, dragElS2Opp = vertical ? dragRect.right : dragRect.bottom, dragElOppLength = vertical ? dragRect.width : dragRect.height, targetS1Opp = vertical ? targetRect.left : targetRect.top, targetS2Opp = vertical ? targetRect.right : targetRect.bottom, targetOppLength = vertical ? targetRect.width : targetRect.height;
  return dragElS1Opp === targetS1Opp || dragElS2Opp === targetS2Opp || dragElS1Opp + dragElOppLength / 2 === targetS1Opp + targetOppLength / 2;
};
var _detectNearestEmptySortable = function _detectNearestEmptySortable2(x, y) {
  var ret;
  sortables.some(function(sortable) {
    var threshold = sortable[expando].options.emptyInsertThreshold;
    if (!threshold || lastChild(sortable)) return;
    var rect = getRect(sortable), insideHorizontally = x >= rect.left - threshold && x <= rect.right + threshold, insideVertically = y >= rect.top - threshold && y <= rect.bottom + threshold;
    if (insideHorizontally && insideVertically) {
      return ret = sortable;
    }
  });
  return ret;
};
var _prepareGroup = function _prepareGroup2(options2) {
  function toFn(value, pull) {
    return function(to, from, dragEl2, evt) {
      var sameGroup = to.options.group.name && from.options.group.name && to.options.group.name === from.options.group.name;
      if (value == null && (pull || sameGroup)) {
        return true;
      } else if (value == null || value === false) {
        return false;
      } else if (pull && value === "clone") {
        return value;
      } else if (typeof value === "function") {
        return toFn(value(to, from, dragEl2, evt), pull)(to, from, dragEl2, evt);
      } else {
        var otherGroup = (pull ? to : from).options.group.name;
        return value === true || typeof value === "string" && value === otherGroup || value.join && value.indexOf(otherGroup) > -1;
      }
    };
  }
  var group = {};
  var originalGroup = options2.group;
  if (!originalGroup || _typeof(originalGroup) != "object") {
    originalGroup = {
      name: originalGroup
    };
  }
  group.name = originalGroup.name;
  group.checkPull = toFn(originalGroup.pull, true);
  group.checkPut = toFn(originalGroup.put);
  group.revertClone = originalGroup.revertClone;
  options2.group = group;
};
var _hideGhostForTarget = function _hideGhostForTarget2() {
  if (!supportCssPointerEvents && ghostEl) {
    css(ghostEl, "display", "none");
  }
};
var _unhideGhostForTarget = function _unhideGhostForTarget2() {
  if (!supportCssPointerEvents && ghostEl) {
    css(ghostEl, "display", "");
  }
};
if (documentExists && !ChromeForAndroid) {
  document.addEventListener("click", function(evt) {
    if (ignoreNextClick) {
      evt.preventDefault();
      evt.stopPropagation && evt.stopPropagation();
      evt.stopImmediatePropagation && evt.stopImmediatePropagation();
      ignoreNextClick = false;
      return false;
    }
  }, true);
}
var nearestEmptyInsertDetectEvent = function nearestEmptyInsertDetectEvent2(evt) {
  if (dragEl) {
    evt = evt.touches ? evt.touches[0] : evt;
    var nearest = _detectNearestEmptySortable(evt.clientX, evt.clientY);
    if (nearest) {
      var event = {};
      for (var i in evt) {
        if (evt.hasOwnProperty(i)) {
          event[i] = evt[i];
        }
      }
      event.target = event.rootEl = nearest;
      event.preventDefault = void 0;
      event.stopPropagation = void 0;
      nearest[expando]._onDragOver(event);
    }
  }
};
var _checkOutsideTargetEl = function _checkOutsideTargetEl2(evt) {
  if (dragEl) {
    dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
  }
};
function Sortable(el2, options2) {
  if (!(el2 && el2.nodeType && el2.nodeType === 1)) {
    throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(el2));
  }
  this.el = el2;
  this.options = options2 = _extends({}, options2);
  el2[expando] = this;
  var defaults2 = {
    group: null,
    sort: true,
    disabled: false,
    store: null,
    handle: null,
    draggable: /^[uo]l$/i.test(el2.nodeName) ? ">li" : ">*",
    swapThreshold: 1,
    // percentage; 0 <= x <= 1
    invertSwap: false,
    // invert always
    invertedSwapThreshold: null,
    // will be set to same as swapThreshold if default
    removeCloneOnHide: true,
    direction: function direction() {
      return _detectDirection(el2, this.options);
    },
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    ignore: "a, img",
    filter: null,
    preventOnFilter: true,
    animation: 0,
    easing: null,
    setData: function setData(dataTransfer, dragEl2) {
      dataTransfer.setData("Text", dragEl2.textContent);
    },
    dropBubble: false,
    dragoverBubble: false,
    dataIdAttr: "data-id",
    delay: 0,
    delayOnTouchOnly: false,
    touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
    forceFallback: false,
    fallbackClass: "sortable-fallback",
    fallbackOnBody: false,
    fallbackTolerance: 0,
    fallbackOffset: {
      x: 0,
      y: 0
    },
    // Disabled on Safari: #1571; Enabled on Safari IOS: #2244
    supportPointer: Sortable.supportPointer !== false && "PointerEvent" in window && (!Safari || IOS),
    emptyInsertThreshold: 5
  };
  PluginManager.initializePlugins(this, el2, defaults2);
  for (var name in defaults2) {
    !(name in options2) && (options2[name] = defaults2[name]);
  }
  _prepareGroup(options2);
  for (var fn in this) {
    if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
      this[fn] = this[fn].bind(this);
    }
  }
  this.nativeDraggable = options2.forceFallback ? false : supportDraggable;
  if (this.nativeDraggable) {
    this.options.touchStartThreshold = 1;
  }
  if (options2.supportPointer) {
    on(el2, "pointerdown", this._onTapStart);
  } else {
    on(el2, "mousedown", this._onTapStart);
    on(el2, "touchstart", this._onTapStart);
  }
  if (this.nativeDraggable) {
    on(el2, "dragover", this);
    on(el2, "dragenter", this);
  }
  sortables.push(this.el);
  options2.store && options2.store.get && this.sort(options2.store.get(this) || []);
  _extends(this, AnimationStateManager());
}
Sortable.prototype = /** @lends Sortable.prototype */
{
  constructor: Sortable,
  _isOutsideThisEl: function _isOutsideThisEl(target) {
    if (!this.el.contains(target) && target !== this.el) {
      lastTarget = null;
    }
  },
  _getDirection: function _getDirection(evt, target) {
    return typeof this.options.direction === "function" ? this.options.direction.call(this, evt, target, dragEl) : this.options.direction;
  },
  _onTapStart: function _onTapStart(evt) {
    if (!evt.cancelable) return;
    var _this = this, el2 = this.el, options2 = this.options, preventOnFilter = options2.preventOnFilter, type = evt.type, touch = evt.touches && evt.touches[0] || evt.pointerType && evt.pointerType === "touch" && evt, target = (touch || evt).target, originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0] || evt.composedPath && evt.composedPath()[0]) || target, filter = options2.filter;
    _saveInputCheckedState(el2);
    if (dragEl) {
      return;
    }
    if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options2.disabled) {
      return;
    }
    if (originalTarget.isContentEditable) {
      return;
    }
    if (!this.nativeDraggable && Safari && target && target.tagName.toUpperCase() === "SELECT") {
      return;
    }
    target = closest(target, options2.draggable, el2, false);
    if (target && target.animated) {
      return;
    }
    if (lastDownEl === target) {
      return;
    }
    oldIndex = index(target);
    oldDraggableIndex = index(target, options2.draggable);
    if (typeof filter === "function") {
      if (filter.call(this, evt, target, this)) {
        _dispatchEvent({
          sortable: _this,
          rootEl: originalTarget,
          name: "filter",
          targetEl: target,
          toEl: el2,
          fromEl: el2
        });
        pluginEvent2("filter", _this, {
          evt
        });
        preventOnFilter && evt.preventDefault();
        return;
      }
    } else if (filter) {
      filter = filter.split(",").some(function(criteria) {
        criteria = closest(originalTarget, criteria.trim(), el2, false);
        if (criteria) {
          _dispatchEvent({
            sortable: _this,
            rootEl: criteria,
            name: "filter",
            targetEl: target,
            fromEl: el2,
            toEl: el2
          });
          pluginEvent2("filter", _this, {
            evt
          });
          return true;
        }
      });
      if (filter) {
        preventOnFilter && evt.preventDefault();
        return;
      }
    }
    if (options2.handle && !closest(originalTarget, options2.handle, el2, false)) {
      return;
    }
    this._prepareDragStart(evt, touch, target);
  },
  _prepareDragStart: function _prepareDragStart(evt, touch, target) {
    var _this = this, el2 = _this.el, options2 = _this.options, ownerDocument = el2.ownerDocument, dragStartFn;
    if (target && !dragEl && target.parentNode === el2) {
      var dragRect = getRect(target);
      rootEl = el2;
      dragEl = target;
      parentEl = dragEl.parentNode;
      nextEl = dragEl.nextSibling;
      lastDownEl = target;
      activeGroup = options2.group;
      Sortable.dragged = dragEl;
      tapEvt = {
        target: dragEl,
        clientX: (touch || evt).clientX,
        clientY: (touch || evt).clientY
      };
      tapDistanceLeft = tapEvt.clientX - dragRect.left;
      tapDistanceTop = tapEvt.clientY - dragRect.top;
      this._lastX = (touch || evt).clientX;
      this._lastY = (touch || evt).clientY;
      dragEl.style["will-change"] = "all";
      dragStartFn = function dragStartFn2() {
        pluginEvent2("delayEnded", _this, {
          evt
        });
        if (Sortable.eventCanceled) {
          _this._onDrop();
          return;
        }
        _this._disableDelayedDragEvents();
        if (!FireFox && _this.nativeDraggable) {
          dragEl.draggable = true;
        }
        _this._triggerDragStart(evt, touch);
        _dispatchEvent({
          sortable: _this,
          name: "choose",
          originalEvent: evt
        });
        toggleClass(dragEl, options2.chosenClass, true);
      };
      options2.ignore.split(",").forEach(function(criteria) {
        find(dragEl, criteria.trim(), _disableDraggable);
      });
      on(ownerDocument, "dragover", nearestEmptyInsertDetectEvent);
      on(ownerDocument, "mousemove", nearestEmptyInsertDetectEvent);
      on(ownerDocument, "touchmove", nearestEmptyInsertDetectEvent);
      if (options2.supportPointer) {
        on(ownerDocument, "pointerup", _this._onDrop);
        !this.nativeDraggable && on(ownerDocument, "pointercancel", _this._onDrop);
      } else {
        on(ownerDocument, "mouseup", _this._onDrop);
        on(ownerDocument, "touchend", _this._onDrop);
        on(ownerDocument, "touchcancel", _this._onDrop);
      }
      if (FireFox && this.nativeDraggable) {
        this.options.touchStartThreshold = 4;
        dragEl.draggable = true;
      }
      pluginEvent2("delayStart", this, {
        evt
      });
      if (options2.delay && (!options2.delayOnTouchOnly || touch) && (!this.nativeDraggable || !(Edge || IE11OrLess))) {
        if (Sortable.eventCanceled) {
          this._onDrop();
          return;
        }
        if (options2.supportPointer) {
          on(ownerDocument, "pointerup", _this._disableDelayedDrag);
          on(ownerDocument, "pointercancel", _this._disableDelayedDrag);
        } else {
          on(ownerDocument, "mouseup", _this._disableDelayedDrag);
          on(ownerDocument, "touchend", _this._disableDelayedDrag);
          on(ownerDocument, "touchcancel", _this._disableDelayedDrag);
        }
        on(ownerDocument, "mousemove", _this._delayedDragTouchMoveHandler);
        on(ownerDocument, "touchmove", _this._delayedDragTouchMoveHandler);
        options2.supportPointer && on(ownerDocument, "pointermove", _this._delayedDragTouchMoveHandler);
        _this._dragStartTimer = setTimeout(dragStartFn, options2.delay);
      } else {
        dragStartFn();
      }
    }
  },
  _delayedDragTouchMoveHandler: function _delayedDragTouchMoveHandler(e) {
    var touch = e.touches ? e.touches[0] : e;
    if (Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1))) {
      this._disableDelayedDrag();
    }
  },
  _disableDelayedDrag: function _disableDelayedDrag() {
    dragEl && _disableDraggable(dragEl);
    clearTimeout(this._dragStartTimer);
    this._disableDelayedDragEvents();
  },
  _disableDelayedDragEvents: function _disableDelayedDragEvents() {
    var ownerDocument = this.el.ownerDocument;
    off(ownerDocument, "mouseup", this._disableDelayedDrag);
    off(ownerDocument, "touchend", this._disableDelayedDrag);
    off(ownerDocument, "touchcancel", this._disableDelayedDrag);
    off(ownerDocument, "pointerup", this._disableDelayedDrag);
    off(ownerDocument, "pointercancel", this._disableDelayedDrag);
    off(ownerDocument, "mousemove", this._delayedDragTouchMoveHandler);
    off(ownerDocument, "touchmove", this._delayedDragTouchMoveHandler);
    off(ownerDocument, "pointermove", this._delayedDragTouchMoveHandler);
  },
  _triggerDragStart: function _triggerDragStart(evt, touch) {
    touch = touch || evt.pointerType == "touch" && evt;
    if (!this.nativeDraggable || touch) {
      if (this.options.supportPointer) {
        on(document, "pointermove", this._onTouchMove);
      } else if (touch) {
        on(document, "touchmove", this._onTouchMove);
      } else {
        on(document, "mousemove", this._onTouchMove);
      }
    } else {
      on(dragEl, "dragend", this);
      on(rootEl, "dragstart", this._onDragStart);
    }
    try {
      if (document.selection) {
        _nextTick(function() {
          document.selection.empty();
        });
      } else {
        window.getSelection().removeAllRanges();
      }
    } catch (err) {
    }
  },
  _dragStarted: function _dragStarted(fallback, evt) {
    awaitingDragStarted = false;
    if (rootEl && dragEl) {
      pluginEvent2("dragStarted", this, {
        evt
      });
      if (this.nativeDraggable) {
        on(document, "dragover", _checkOutsideTargetEl);
      }
      var options2 = this.options;
      !fallback && toggleClass(dragEl, options2.dragClass, false);
      toggleClass(dragEl, options2.ghostClass, true);
      Sortable.active = this;
      fallback && this._appendGhost();
      _dispatchEvent({
        sortable: this,
        name: "start",
        originalEvent: evt
      });
    } else {
      this._nulling();
    }
  },
  _emulateDragOver: function _emulateDragOver() {
    if (touchEvt) {
      this._lastX = touchEvt.clientX;
      this._lastY = touchEvt.clientY;
      _hideGhostForTarget();
      var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
      var parent = target;
      while (target && target.shadowRoot) {
        target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
        if (target === parent) break;
        parent = target;
      }
      dragEl.parentNode[expando]._isOutsideThisEl(target);
      if (parent) {
        do {
          if (parent[expando]) {
            var inserted = void 0;
            inserted = parent[expando]._onDragOver({
              clientX: touchEvt.clientX,
              clientY: touchEvt.clientY,
              target,
              rootEl: parent
            });
            if (inserted && !this.options.dragoverBubble) {
              break;
            }
          }
          target = parent;
        } while (parent = getParentOrHost(parent));
      }
      _unhideGhostForTarget();
    }
  },
  _onTouchMove: function _onTouchMove(evt) {
    if (tapEvt) {
      var options2 = this.options, fallbackTolerance = options2.fallbackTolerance, fallbackOffset = options2.fallbackOffset, touch = evt.touches ? evt.touches[0] : evt, ghostMatrix = ghostEl && matrix(ghostEl, true), scaleX = ghostEl && ghostMatrix && ghostMatrix.a, scaleY = ghostEl && ghostMatrix && ghostMatrix.d, relativeScrollOffset = PositionGhostAbsolutely && ghostRelativeParent && getRelativeScrollOffset(ghostRelativeParent), dx = (touch.clientX - tapEvt.clientX + fallbackOffset.x) / (scaleX || 1) + (relativeScrollOffset ? relativeScrollOffset[0] - ghostRelativeParentInitialScroll[0] : 0) / (scaleX || 1), dy = (touch.clientY - tapEvt.clientY + fallbackOffset.y) / (scaleY || 1) + (relativeScrollOffset ? relativeScrollOffset[1] - ghostRelativeParentInitialScroll[1] : 0) / (scaleY || 1);
      if (!Sortable.active && !awaitingDragStarted) {
        if (fallbackTolerance && Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) < fallbackTolerance) {
          return;
        }
        this._onDragStart(evt, true);
      }
      if (ghostEl) {
        if (ghostMatrix) {
          ghostMatrix.e += dx - (lastDx || 0);
          ghostMatrix.f += dy - (lastDy || 0);
        } else {
          ghostMatrix = {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            e: dx,
            f: dy
          };
        }
        var cssMatrix = "matrix(".concat(ghostMatrix.a, ",").concat(ghostMatrix.b, ",").concat(ghostMatrix.c, ",").concat(ghostMatrix.d, ",").concat(ghostMatrix.e, ",").concat(ghostMatrix.f, ")");
        css(ghostEl, "webkitTransform", cssMatrix);
        css(ghostEl, "mozTransform", cssMatrix);
        css(ghostEl, "msTransform", cssMatrix);
        css(ghostEl, "transform", cssMatrix);
        lastDx = dx;
        lastDy = dy;
        touchEvt = touch;
      }
      evt.cancelable && evt.preventDefault();
    }
  },
  _appendGhost: function _appendGhost() {
    if (!ghostEl) {
      var container = this.options.fallbackOnBody ? document.body : rootEl, rect = getRect(dragEl, true, PositionGhostAbsolutely, true, container), options2 = this.options;
      if (PositionGhostAbsolutely) {
        ghostRelativeParent = container;
        while (css(ghostRelativeParent, "position") === "static" && css(ghostRelativeParent, "transform") === "none" && ghostRelativeParent !== document) {
          ghostRelativeParent = ghostRelativeParent.parentNode;
        }
        if (ghostRelativeParent !== document.body && ghostRelativeParent !== document.documentElement) {
          if (ghostRelativeParent === document) ghostRelativeParent = getWindowScrollingElement();
          rect.top += ghostRelativeParent.scrollTop;
          rect.left += ghostRelativeParent.scrollLeft;
        } else {
          ghostRelativeParent = getWindowScrollingElement();
        }
        ghostRelativeParentInitialScroll = getRelativeScrollOffset(ghostRelativeParent);
      }
      ghostEl = dragEl.cloneNode(true);
      toggleClass(ghostEl, options2.ghostClass, false);
      toggleClass(ghostEl, options2.fallbackClass, true);
      toggleClass(ghostEl, options2.dragClass, true);
      css(ghostEl, "transition", "");
      css(ghostEl, "transform", "");
      css(ghostEl, "box-sizing", "border-box");
      css(ghostEl, "margin", 0);
      css(ghostEl, "top", rect.top);
      css(ghostEl, "left", rect.left);
      css(ghostEl, "width", rect.width);
      css(ghostEl, "height", rect.height);
      css(ghostEl, "opacity", "0.8");
      css(ghostEl, "position", PositionGhostAbsolutely ? "absolute" : "fixed");
      css(ghostEl, "zIndex", "100000");
      css(ghostEl, "pointerEvents", "none");
      Sortable.ghost = ghostEl;
      container.appendChild(ghostEl);
      css(ghostEl, "transform-origin", tapDistanceLeft / parseInt(ghostEl.style.width) * 100 + "% " + tapDistanceTop / parseInt(ghostEl.style.height) * 100 + "%");
    }
  },
  _onDragStart: function _onDragStart(evt, fallback) {
    var _this = this;
    var dataTransfer = evt.dataTransfer;
    var options2 = _this.options;
    pluginEvent2("dragStart", this, {
      evt
    });
    if (Sortable.eventCanceled) {
      this._onDrop();
      return;
    }
    pluginEvent2("setupClone", this);
    if (!Sortable.eventCanceled) {
      cloneEl = clone(dragEl);
      cloneEl.removeAttribute("id");
      cloneEl.draggable = false;
      cloneEl.style["will-change"] = "";
      this._hideClone();
      toggleClass(cloneEl, this.options.chosenClass, false);
      Sortable.clone = cloneEl;
    }
    _this.cloneId = _nextTick(function() {
      pluginEvent2("clone", _this);
      if (Sortable.eventCanceled) return;
      if (!_this.options.removeCloneOnHide) {
        rootEl.insertBefore(cloneEl, dragEl);
      }
      _this._hideClone();
      _dispatchEvent({
        sortable: _this,
        name: "clone"
      });
    });
    !fallback && toggleClass(dragEl, options2.dragClass, true);
    if (fallback) {
      ignoreNextClick = true;
      _this._loopId = setInterval(_this._emulateDragOver, 50);
    } else {
      off(document, "mouseup", _this._onDrop);
      off(document, "touchend", _this._onDrop);
      off(document, "touchcancel", _this._onDrop);
      if (dataTransfer) {
        dataTransfer.effectAllowed = "move";
        options2.setData && options2.setData.call(_this, dataTransfer, dragEl);
      }
      on(document, "drop", _this);
      css(dragEl, "transform", "translateZ(0)");
    }
    awaitingDragStarted = true;
    _this._dragStartId = _nextTick(_this._dragStarted.bind(_this, fallback, evt));
    on(document, "selectstart", _this);
    moved = true;
    window.getSelection().removeAllRanges();
    if (Safari) {
      css(document.body, "user-select", "none");
    }
  },
  // Returns true - if no further action is needed (either inserted or another condition)
  _onDragOver: function _onDragOver(evt) {
    var el2 = this.el, target = evt.target, dragRect, targetRect, revert, options2 = this.options, group = options2.group, activeSortable = Sortable.active, isOwner = activeGroup === group, canSort = options2.sort, fromSortable = putSortable || activeSortable, vertical, _this = this, completedFired = false;
    if (_silent) return;
    function dragOverEvent(name, extra) {
      pluginEvent2(name, _this, _objectSpread2({
        evt,
        isOwner,
        axis: vertical ? "vertical" : "horizontal",
        revert,
        dragRect,
        targetRect,
        canSort,
        fromSortable,
        target,
        completed,
        onMove: function onMove(target2, after2) {
          return _onMove(rootEl, el2, dragEl, dragRect, target2, getRect(target2), evt, after2);
        },
        changed
      }, extra));
    }
    function capture() {
      dragOverEvent("dragOverAnimationCapture");
      _this.captureAnimationState();
      if (_this !== fromSortable) {
        fromSortable.captureAnimationState();
      }
    }
    function completed(insertion) {
      dragOverEvent("dragOverCompleted", {
        insertion
      });
      if (insertion) {
        if (isOwner) {
          activeSortable._hideClone();
        } else {
          activeSortable._showClone(_this);
        }
        if (_this !== fromSortable) {
          toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : activeSortable.options.ghostClass, false);
          toggleClass(dragEl, options2.ghostClass, true);
        }
        if (putSortable !== _this && _this !== Sortable.active) {
          putSortable = _this;
        } else if (_this === Sortable.active && putSortable) {
          putSortable = null;
        }
        if (fromSortable === _this) {
          _this._ignoreWhileAnimating = target;
        }
        _this.animateAll(function() {
          dragOverEvent("dragOverAnimationComplete");
          _this._ignoreWhileAnimating = null;
        });
        if (_this !== fromSortable) {
          fromSortable.animateAll();
          fromSortable._ignoreWhileAnimating = null;
        }
      }
      if (target === dragEl && !dragEl.animated || target === el2 && !target.animated) {
        lastTarget = null;
      }
      if (!options2.dragoverBubble && !evt.rootEl && target !== document) {
        dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
        !insertion && nearestEmptyInsertDetectEvent(evt);
      }
      !options2.dragoverBubble && evt.stopPropagation && evt.stopPropagation();
      return completedFired = true;
    }
    function changed() {
      newIndex = index(dragEl);
      newDraggableIndex = index(dragEl, options2.draggable);
      _dispatchEvent({
        sortable: _this,
        name: "change",
        toEl: el2,
        newIndex,
        newDraggableIndex,
        originalEvent: evt
      });
    }
    if (evt.preventDefault !== void 0) {
      evt.cancelable && evt.preventDefault();
    }
    target = closest(target, options2.draggable, el2, true);
    dragOverEvent("dragOver");
    if (Sortable.eventCanceled) return completedFired;
    if (dragEl.contains(evt.target) || target.animated && target.animatingX && target.animatingY || _this._ignoreWhileAnimating === target) {
      return completed(false);
    }
    ignoreNextClick = false;
    if (activeSortable && !options2.disabled && (isOwner ? canSort || (revert = parentEl !== rootEl) : putSortable === this || (this.lastPutMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) && group.checkPut(this, activeSortable, dragEl, evt))) {
      vertical = this._getDirection(evt, target) === "vertical";
      dragRect = getRect(dragEl);
      dragOverEvent("dragOverValid");
      if (Sortable.eventCanceled) return completedFired;
      if (revert) {
        parentEl = rootEl;
        capture();
        this._hideClone();
        dragOverEvent("revert");
        if (!Sortable.eventCanceled) {
          if (nextEl) {
            rootEl.insertBefore(dragEl, nextEl);
          } else {
            rootEl.appendChild(dragEl);
          }
        }
        return completed(true);
      }
      var elLastChild = lastChild(el2, options2.draggable);
      if (!elLastChild || _ghostIsLast(evt, vertical, this) && !elLastChild.animated) {
        if (elLastChild === dragEl) {
          return completed(false);
        }
        if (elLastChild && el2 === evt.target) {
          target = elLastChild;
        }
        if (target) {
          targetRect = getRect(target);
        }
        if (_onMove(rootEl, el2, dragEl, dragRect, target, targetRect, evt, !!target) !== false) {
          capture();
          if (elLastChild && elLastChild.nextSibling) {
            el2.insertBefore(dragEl, elLastChild.nextSibling);
          } else {
            el2.appendChild(dragEl);
          }
          parentEl = el2;
          changed();
          return completed(true);
        }
      } else if (elLastChild && _ghostIsFirst(evt, vertical, this)) {
        var firstChild = getChild(el2, 0, options2, true);
        if (firstChild === dragEl) {
          return completed(false);
        }
        target = firstChild;
        targetRect = getRect(target);
        if (_onMove(rootEl, el2, dragEl, dragRect, target, targetRect, evt, false) !== false) {
          capture();
          el2.insertBefore(dragEl, firstChild);
          parentEl = el2;
          changed();
          return completed(true);
        }
      } else if (target.parentNode === el2) {
        targetRect = getRect(target);
        var direction = 0, targetBeforeFirstSwap, differentLevel = dragEl.parentNode !== el2, differentRowCol = !_dragElInRowColumn(dragEl.animated && dragEl.toRect || dragRect, target.animated && target.toRect || targetRect, vertical), side1 = vertical ? "top" : "left", scrolledPastTop = isScrolledPast(target, "top", "top") || isScrolledPast(dragEl, "top", "top"), scrollBefore = scrolledPastTop ? scrolledPastTop.scrollTop : void 0;
        if (lastTarget !== target) {
          targetBeforeFirstSwap = targetRect[side1];
          pastFirstInvertThresh = false;
          isCircumstantialInvert = !differentRowCol && options2.invertSwap || differentLevel;
        }
        direction = _getSwapDirection(evt, target, targetRect, vertical, differentRowCol ? 1 : options2.swapThreshold, options2.invertedSwapThreshold == null ? options2.swapThreshold : options2.invertedSwapThreshold, isCircumstantialInvert, lastTarget === target);
        var sibling;
        if (direction !== 0) {
          var dragIndex = index(dragEl);
          do {
            dragIndex -= direction;
            sibling = parentEl.children[dragIndex];
          } while (sibling && (css(sibling, "display") === "none" || sibling === ghostEl));
        }
        if (direction === 0 || sibling === target) {
          return completed(false);
        }
        lastTarget = target;
        lastDirection = direction;
        var nextSibling = target.nextElementSibling, after = false;
        after = direction === 1;
        var moveVector = _onMove(rootEl, el2, dragEl, dragRect, target, targetRect, evt, after);
        if (moveVector !== false) {
          if (moveVector === 1 || moveVector === -1) {
            after = moveVector === 1;
          }
          _silent = true;
          setTimeout(_unsilent, 30);
          capture();
          if (after && !nextSibling) {
            el2.appendChild(dragEl);
          } else {
            target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
          }
          if (scrolledPastTop) {
            scrollBy(scrolledPastTop, 0, scrollBefore - scrolledPastTop.scrollTop);
          }
          parentEl = dragEl.parentNode;
          if (targetBeforeFirstSwap !== void 0 && !isCircumstantialInvert) {
            targetMoveDistance = Math.abs(targetBeforeFirstSwap - getRect(target)[side1]);
          }
          changed();
          return completed(true);
        }
      }
      if (el2.contains(dragEl)) {
        return completed(false);
      }
    }
    return false;
  },
  _ignoreWhileAnimating: null,
  _offMoveEvents: function _offMoveEvents() {
    off(document, "mousemove", this._onTouchMove);
    off(document, "touchmove", this._onTouchMove);
    off(document, "pointermove", this._onTouchMove);
    off(document, "dragover", nearestEmptyInsertDetectEvent);
    off(document, "mousemove", nearestEmptyInsertDetectEvent);
    off(document, "touchmove", nearestEmptyInsertDetectEvent);
  },
  _offUpEvents: function _offUpEvents() {
    var ownerDocument = this.el.ownerDocument;
    off(ownerDocument, "mouseup", this._onDrop);
    off(ownerDocument, "touchend", this._onDrop);
    off(ownerDocument, "pointerup", this._onDrop);
    off(ownerDocument, "pointercancel", this._onDrop);
    off(ownerDocument, "touchcancel", this._onDrop);
    off(document, "selectstart", this);
  },
  _onDrop: function _onDrop(evt) {
    var el2 = this.el, options2 = this.options;
    newIndex = index(dragEl);
    newDraggableIndex = index(dragEl, options2.draggable);
    pluginEvent2("drop", this, {
      evt
    });
    parentEl = dragEl && dragEl.parentNode;
    newIndex = index(dragEl);
    newDraggableIndex = index(dragEl, options2.draggable);
    if (Sortable.eventCanceled) {
      this._nulling();
      return;
    }
    awaitingDragStarted = false;
    isCircumstantialInvert = false;
    pastFirstInvertThresh = false;
    clearInterval(this._loopId);
    clearTimeout(this._dragStartTimer);
    _cancelNextTick(this.cloneId);
    _cancelNextTick(this._dragStartId);
    if (this.nativeDraggable) {
      off(document, "drop", this);
      off(el2, "dragstart", this._onDragStart);
    }
    this._offMoveEvents();
    this._offUpEvents();
    if (Safari) {
      css(document.body, "user-select", "");
    }
    css(dragEl, "transform", "");
    if (evt) {
      if (moved) {
        evt.cancelable && evt.preventDefault();
        !options2.dropBubble && evt.stopPropagation();
      }
      ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);
      if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== "clone") {
        cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
      }
      if (dragEl) {
        if (this.nativeDraggable) {
          off(dragEl, "dragend", this);
        }
        _disableDraggable(dragEl);
        dragEl.style["will-change"] = "";
        if (moved && !awaitingDragStarted) {
          toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : this.options.ghostClass, false);
        }
        toggleClass(dragEl, this.options.chosenClass, false);
        _dispatchEvent({
          sortable: this,
          name: "unchoose",
          toEl: parentEl,
          newIndex: null,
          newDraggableIndex: null,
          originalEvent: evt
        });
        if (rootEl !== parentEl) {
          if (newIndex >= 0) {
            _dispatchEvent({
              rootEl: parentEl,
              name: "add",
              toEl: parentEl,
              fromEl: rootEl,
              originalEvent: evt
            });
            _dispatchEvent({
              sortable: this,
              name: "remove",
              toEl: parentEl,
              originalEvent: evt
            });
            _dispatchEvent({
              rootEl: parentEl,
              name: "sort",
              toEl: parentEl,
              fromEl: rootEl,
              originalEvent: evt
            });
            _dispatchEvent({
              sortable: this,
              name: "sort",
              toEl: parentEl,
              originalEvent: evt
            });
          }
          putSortable && putSortable.save();
        } else {
          if (newIndex !== oldIndex) {
            if (newIndex >= 0) {
              _dispatchEvent({
                sortable: this,
                name: "update",
                toEl: parentEl,
                originalEvent: evt
              });
              _dispatchEvent({
                sortable: this,
                name: "sort",
                toEl: parentEl,
                originalEvent: evt
              });
            }
          }
        }
        if (Sortable.active) {
          if (newIndex == null || newIndex === -1) {
            newIndex = oldIndex;
            newDraggableIndex = oldDraggableIndex;
          }
          _dispatchEvent({
            sortable: this,
            name: "end",
            toEl: parentEl,
            originalEvent: evt
          });
          this.save();
        }
      }
    }
    this._nulling();
  },
  _nulling: function _nulling() {
    pluginEvent2("nulling", this);
    rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = cloneHidden = tapEvt = touchEvt = moved = newIndex = newDraggableIndex = oldIndex = oldDraggableIndex = lastTarget = lastDirection = putSortable = activeGroup = Sortable.dragged = Sortable.ghost = Sortable.clone = Sortable.active = null;
    savedInputChecked.forEach(function(el2) {
      el2.checked = true;
    });
    savedInputChecked.length = lastDx = lastDy = 0;
  },
  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case "drop":
      case "dragend":
        this._onDrop(evt);
        break;
      case "dragenter":
      case "dragover":
        if (dragEl) {
          this._onDragOver(evt);
          _globalDragOver(evt);
        }
        break;
      case "selectstart":
        evt.preventDefault();
        break;
    }
  },
  /**
   * Serializes the item into an array of string.
   * @returns {String[]}
   */
  toArray: function toArray() {
    var order = [], el2, children = this.el.children, i = 0, n = children.length, options2 = this.options;
    for (; i < n; i++) {
      el2 = children[i];
      if (closest(el2, options2.draggable, this.el, false)) {
        order.push(el2.getAttribute(options2.dataIdAttr) || _generateId(el2));
      }
    }
    return order;
  },
  /**
   * Sorts the elements according to the array.
   * @param  {String[]}  order  order of the items
   */
  sort: function sort(order, useAnimation) {
    var items = {}, rootEl2 = this.el;
    this.toArray().forEach(function(id, i) {
      var el2 = rootEl2.children[i];
      if (closest(el2, this.options.draggable, rootEl2, false)) {
        items[id] = el2;
      }
    }, this);
    useAnimation && this.captureAnimationState();
    order.forEach(function(id) {
      if (items[id]) {
        rootEl2.removeChild(items[id]);
        rootEl2.appendChild(items[id]);
      }
    });
    useAnimation && this.animateAll();
  },
  /**
   * Save the current sorting
   */
  save: function save() {
    var store = this.options.store;
    store && store.set && store.set(this);
  },
  /**
   * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
   * @param   {HTMLElement}  el
   * @param   {String}       [selector]  default: `options.draggable`
   * @returns {HTMLElement|null}
   */
  closest: function closest$1(el2, selector) {
    return closest(el2, selector || this.options.draggable, this.el, false);
  },
  /**
   * Set/get option
   * @param   {string} name
   * @param   {*}      [value]
   * @returns {*}
   */
  option: function option(name, value) {
    var options2 = this.options;
    if (value === void 0) {
      return options2[name];
    } else {
      var modifiedValue = PluginManager.modifyOption(this, name, value);
      if (typeof modifiedValue !== "undefined") {
        options2[name] = modifiedValue;
      } else {
        options2[name] = value;
      }
      if (name === "group") {
        _prepareGroup(options2);
      }
    }
  },
  /**
   * Destroy
   */
  destroy: function destroy() {
    pluginEvent2("destroy", this);
    var el2 = this.el;
    el2[expando] = null;
    off(el2, "mousedown", this._onTapStart);
    off(el2, "touchstart", this._onTapStart);
    off(el2, "pointerdown", this._onTapStart);
    if (this.nativeDraggable) {
      off(el2, "dragover", this);
      off(el2, "dragenter", this);
    }
    Array.prototype.forEach.call(el2.querySelectorAll("[draggable]"), function(el3) {
      el3.removeAttribute("draggable");
    });
    this._onDrop();
    this._disableDelayedDragEvents();
    sortables.splice(sortables.indexOf(this.el), 1);
    this.el = el2 = null;
  },
  _hideClone: function _hideClone() {
    if (!cloneHidden) {
      pluginEvent2("hideClone", this);
      if (Sortable.eventCanceled) return;
      css(cloneEl, "display", "none");
      if (this.options.removeCloneOnHide && cloneEl.parentNode) {
        cloneEl.parentNode.removeChild(cloneEl);
      }
      cloneHidden = true;
    }
  },
  _showClone: function _showClone(putSortable2) {
    if (putSortable2.lastPutMode !== "clone") {
      this._hideClone();
      return;
    }
    if (cloneHidden) {
      pluginEvent2("showClone", this);
      if (Sortable.eventCanceled) return;
      if (dragEl.parentNode == rootEl && !this.options.group.revertClone) {
        rootEl.insertBefore(cloneEl, dragEl);
      } else if (nextEl) {
        rootEl.insertBefore(cloneEl, nextEl);
      } else {
        rootEl.appendChild(cloneEl);
      }
      if (this.options.group.revertClone) {
        this.animate(dragEl, cloneEl);
      }
      css(cloneEl, "display", "");
      cloneHidden = false;
    }
  }
};
function _globalDragOver(evt) {
  if (evt.dataTransfer) {
    evt.dataTransfer.dropEffect = "move";
  }
  evt.cancelable && evt.preventDefault();
}
function _onMove(fromEl, toEl, dragEl2, dragRect, targetEl, targetRect, originalEvent, willInsertAfter) {
  var evt, sortable = fromEl[expando], onMoveFn = sortable.options.onMove, retVal;
  if (window.CustomEvent && !IE11OrLess && !Edge) {
    evt = new CustomEvent("move", {
      bubbles: true,
      cancelable: true
    });
  } else {
    evt = document.createEvent("Event");
    evt.initEvent("move", true, true);
  }
  evt.to = toEl;
  evt.from = fromEl;
  evt.dragged = dragEl2;
  evt.draggedRect = dragRect;
  evt.related = targetEl || toEl;
  evt.relatedRect = targetRect || getRect(toEl);
  evt.willInsertAfter = willInsertAfter;
  evt.originalEvent = originalEvent;
  fromEl.dispatchEvent(evt);
  if (onMoveFn) {
    retVal = onMoveFn.call(sortable, evt, originalEvent);
  }
  return retVal;
}
function _disableDraggable(el2) {
  el2.draggable = false;
}
function _unsilent() {
  _silent = false;
}
function _ghostIsFirst(evt, vertical, sortable) {
  var firstElRect = getRect(getChild(sortable.el, 0, sortable.options, true));
  var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
  var spacer = 10;
  return vertical ? evt.clientX < childContainingRect.left - spacer || evt.clientY < firstElRect.top && evt.clientX < firstElRect.right : evt.clientY < childContainingRect.top - spacer || evt.clientY < firstElRect.bottom && evt.clientX < firstElRect.left;
}
function _ghostIsLast(evt, vertical, sortable) {
  var lastElRect = getRect(lastChild(sortable.el, sortable.options.draggable));
  var childContainingRect = getChildContainingRectFromElement(sortable.el, sortable.options, ghostEl);
  var spacer = 10;
  return vertical ? evt.clientX > childContainingRect.right + spacer || evt.clientY > lastElRect.bottom && evt.clientX > lastElRect.left : evt.clientY > childContainingRect.bottom + spacer || evt.clientX > lastElRect.right && evt.clientY > lastElRect.top;
}
function _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
  var mouseOnAxis = vertical ? evt.clientY : evt.clientX, targetLength = vertical ? targetRect.height : targetRect.width, targetS1 = vertical ? targetRect.top : targetRect.left, targetS2 = vertical ? targetRect.bottom : targetRect.right, invert = false;
  if (!invertSwap) {
    if (isLastTarget && targetMoveDistance < targetLength * swapThreshold) {
      if (!pastFirstInvertThresh && (lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) {
        pastFirstInvertThresh = true;
      }
      if (!pastFirstInvertThresh) {
        if (lastDirection === 1 ? mouseOnAxis < targetS1 + targetMoveDistance : mouseOnAxis > targetS2 - targetMoveDistance) {
          return -lastDirection;
        }
      } else {
        invert = true;
      }
    } else {
      if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) {
        return _getInsertDirection(target);
      }
    }
  }
  invert = invert || invertSwap;
  if (invert) {
    if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) {
      return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
    }
  }
  return 0;
}
function _getInsertDirection(target) {
  if (index(dragEl) < index(target)) {
    return 1;
  } else {
    return -1;
  }
}
function _generateId(el2) {
  var str = el2.tagName + el2.className + el2.src + el2.href + el2.textContent, i = str.length, sum = 0;
  while (i--) {
    sum += str.charCodeAt(i);
  }
  return sum.toString(36);
}
function _saveInputCheckedState(root) {
  savedInputChecked.length = 0;
  var inputs = root.getElementsByTagName("input");
  var idx = inputs.length;
  while (idx--) {
    var el2 = inputs[idx];
    el2.checked && savedInputChecked.push(el2);
  }
}
function _nextTick(fn) {
  return setTimeout(fn, 0);
}
function _cancelNextTick(id) {
  return clearTimeout(id);
}
if (documentExists) {
  on(document, "touchmove", function(evt) {
    if ((Sortable.active || awaitingDragStarted) && evt.cancelable) {
      evt.preventDefault();
    }
  });
}
Sortable.utils = {
  on,
  off,
  css,
  find,
  is: function is(el2, selector) {
    return !!closest(el2, selector, el2, false);
  },
  extend,
  throttle,
  closest,
  toggleClass,
  clone,
  index,
  nextTick: _nextTick,
  cancelNextTick: _cancelNextTick,
  detectDirection: _detectDirection,
  getChild,
  expando
};
Sortable.get = function(element) {
  return element[expando];
};
Sortable.mount = function() {
  for (var _len = arguments.length, plugins2 = new Array(_len), _key = 0; _key < _len; _key++) {
    plugins2[_key] = arguments[_key];
  }
  if (plugins2[0].constructor === Array) plugins2 = plugins2[0];
  plugins2.forEach(function(plugin) {
    if (!plugin.prototype || !plugin.prototype.constructor) {
      throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(plugin));
    }
    if (plugin.utils) Sortable.utils = _objectSpread2(_objectSpread2({}, Sortable.utils), plugin.utils);
    PluginManager.mount(plugin);
  });
};
Sortable.create = function(el2, options2) {
  return new Sortable(el2, options2);
};
Sortable.version = version;
var autoScrolls = [];
var scrollEl;
var scrollRootEl;
var scrolling = false;
var lastAutoScrollX;
var lastAutoScrollY;
var touchEvt$1;
var pointerElemChangedInterval;
function AutoScrollPlugin() {
  function AutoScroll() {
    this.defaults = {
      scroll: true,
      forceAutoScrollFallback: false,
      scrollSensitivity: 30,
      scrollSpeed: 10,
      bubbleScroll: true
    };
    for (var fn in this) {
      if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
        this[fn] = this[fn].bind(this);
      }
    }
  }
  AutoScroll.prototype = {
    dragStarted: function dragStarted2(_ref) {
      var originalEvent = _ref.originalEvent;
      if (this.sortable.nativeDraggable) {
        on(document, "dragover", this._handleAutoScroll);
      } else {
        if (this.options.supportPointer) {
          on(document, "pointermove", this._handleFallbackAutoScroll);
        } else if (originalEvent.touches) {
          on(document, "touchmove", this._handleFallbackAutoScroll);
        } else {
          on(document, "mousemove", this._handleFallbackAutoScroll);
        }
      }
    },
    dragOverCompleted: function dragOverCompleted(_ref2) {
      var originalEvent = _ref2.originalEvent;
      if (!this.options.dragOverBubble && !originalEvent.rootEl) {
        this._handleAutoScroll(originalEvent);
      }
    },
    drop: function drop4() {
      if (this.sortable.nativeDraggable) {
        off(document, "dragover", this._handleAutoScroll);
      } else {
        off(document, "pointermove", this._handleFallbackAutoScroll);
        off(document, "touchmove", this._handleFallbackAutoScroll);
        off(document, "mousemove", this._handleFallbackAutoScroll);
      }
      clearPointerElemChangedInterval();
      clearAutoScrolls();
      cancelThrottle();
    },
    nulling: function nulling() {
      touchEvt$1 = scrollRootEl = scrollEl = scrolling = pointerElemChangedInterval = lastAutoScrollX = lastAutoScrollY = null;
      autoScrolls.length = 0;
    },
    _handleFallbackAutoScroll: function _handleFallbackAutoScroll(evt) {
      this._handleAutoScroll(evt, true);
    },
    _handleAutoScroll: function _handleAutoScroll(evt, fallback) {
      var _this = this;
      var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, elem2 = document.elementFromPoint(x, y);
      touchEvt$1 = evt;
      if (fallback || this.options.forceAutoScrollFallback || Edge || IE11OrLess || Safari) {
        autoScroll(evt, this.options, elem2, fallback);
        var ogElemScroller = getParentAutoScrollElement(elem2, true);
        if (scrolling && (!pointerElemChangedInterval || x !== lastAutoScrollX || y !== lastAutoScrollY)) {
          pointerElemChangedInterval && clearPointerElemChangedInterval();
          pointerElemChangedInterval = setInterval(function() {
            var newElem = getParentAutoScrollElement(document.elementFromPoint(x, y), true);
            if (newElem !== ogElemScroller) {
              ogElemScroller = newElem;
              clearAutoScrolls();
            }
            autoScroll(evt, _this.options, newElem, fallback);
          }, 10);
          lastAutoScrollX = x;
          lastAutoScrollY = y;
        }
      } else {
        if (!this.options.bubbleScroll || getParentAutoScrollElement(elem2, true) === getWindowScrollingElement()) {
          clearAutoScrolls();
          return;
        }
        autoScroll(evt, this.options, getParentAutoScrollElement(elem2, false), false);
      }
    }
  };
  return _extends(AutoScroll, {
    pluginName: "scroll",
    initializeByDefault: true
  });
}
function clearAutoScrolls() {
  autoScrolls.forEach(function(autoScroll2) {
    clearInterval(autoScroll2.pid);
  });
  autoScrolls = [];
}
function clearPointerElemChangedInterval() {
  clearInterval(pointerElemChangedInterval);
}
var autoScroll = throttle(function(evt, options2, rootEl2, isFallback) {
  if (!options2.scroll) return;
  var x = (evt.touches ? evt.touches[0] : evt).clientX, y = (evt.touches ? evt.touches[0] : evt).clientY, sens = options2.scrollSensitivity, speed = options2.scrollSpeed, winScroller = getWindowScrollingElement();
  var scrollThisInstance = false, scrollCustomFn;
  if (scrollRootEl !== rootEl2) {
    scrollRootEl = rootEl2;
    clearAutoScrolls();
    scrollEl = options2.scroll;
    scrollCustomFn = options2.scrollFn;
    if (scrollEl === true) {
      scrollEl = getParentAutoScrollElement(rootEl2, true);
    }
  }
  var layersOut = 0;
  var currentParent = scrollEl;
  do {
    var el2 = currentParent, rect = getRect(el2), top = rect.top, bottom = rect.bottom, left = rect.left, right = rect.right, width = rect.width, height = rect.height, canScrollX = void 0, canScrollY = void 0, scrollWidth = el2.scrollWidth, scrollHeight = el2.scrollHeight, elCSS = css(el2), scrollPosX = el2.scrollLeft, scrollPosY = el2.scrollTop;
    if (el2 === winScroller) {
      canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll" || elCSS.overflowX === "visible");
      canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll" || elCSS.overflowY === "visible");
    } else {
      canScrollX = width < scrollWidth && (elCSS.overflowX === "auto" || elCSS.overflowX === "scroll");
      canScrollY = height < scrollHeight && (elCSS.overflowY === "auto" || elCSS.overflowY === "scroll");
    }
    var vx = canScrollX && (Math.abs(right - x) <= sens && scrollPosX + width < scrollWidth) - (Math.abs(left - x) <= sens && !!scrollPosX);
    var vy = canScrollY && (Math.abs(bottom - y) <= sens && scrollPosY + height < scrollHeight) - (Math.abs(top - y) <= sens && !!scrollPosY);
    if (!autoScrolls[layersOut]) {
      for (var i = 0; i <= layersOut; i++) {
        if (!autoScrolls[i]) {
          autoScrolls[i] = {};
        }
      }
    }
    if (autoScrolls[layersOut].vx != vx || autoScrolls[layersOut].vy != vy || autoScrolls[layersOut].el !== el2) {
      autoScrolls[layersOut].el = el2;
      autoScrolls[layersOut].vx = vx;
      autoScrolls[layersOut].vy = vy;
      clearInterval(autoScrolls[layersOut].pid);
      if (vx != 0 || vy != 0) {
        scrollThisInstance = true;
        autoScrolls[layersOut].pid = setInterval(function() {
          if (isFallback && this.layer === 0) {
            Sortable.active._onTouchMove(touchEvt$1);
          }
          var scrollOffsetY = autoScrolls[this.layer].vy ? autoScrolls[this.layer].vy * speed : 0;
          var scrollOffsetX = autoScrolls[this.layer].vx ? autoScrolls[this.layer].vx * speed : 0;
          if (typeof scrollCustomFn === "function") {
            if (scrollCustomFn.call(Sortable.dragged.parentNode[expando], scrollOffsetX, scrollOffsetY, evt, touchEvt$1, autoScrolls[this.layer].el) !== "continue") {
              return;
            }
          }
          scrollBy(autoScrolls[this.layer].el, scrollOffsetX, scrollOffsetY);
        }.bind({
          layer: layersOut
        }), 24);
      }
    }
    layersOut++;
  } while (options2.bubbleScroll && currentParent !== winScroller && (currentParent = getParentAutoScrollElement(currentParent, false)));
  scrolling = scrollThisInstance;
}, 30);
var drop = function drop2(_ref) {
  var originalEvent = _ref.originalEvent, putSortable2 = _ref.putSortable, dragEl2 = _ref.dragEl, activeSortable = _ref.activeSortable, dispatchSortableEvent = _ref.dispatchSortableEvent, hideGhostForTarget = _ref.hideGhostForTarget, unhideGhostForTarget = _ref.unhideGhostForTarget;
  if (!originalEvent) return;
  var toSortable = putSortable2 || activeSortable;
  hideGhostForTarget();
  var touch = originalEvent.changedTouches && originalEvent.changedTouches.length ? originalEvent.changedTouches[0] : originalEvent;
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  unhideGhostForTarget();
  if (toSortable && !toSortable.el.contains(target)) {
    dispatchSortableEvent("spill");
    this.onSpill({
      dragEl: dragEl2,
      putSortable: putSortable2
    });
  }
};
function Revert() {
}
Revert.prototype = {
  startIndex: null,
  dragStart: function dragStart(_ref2) {
    var oldDraggableIndex2 = _ref2.oldDraggableIndex;
    this.startIndex = oldDraggableIndex2;
  },
  onSpill: function onSpill(_ref3) {
    var dragEl2 = _ref3.dragEl, putSortable2 = _ref3.putSortable;
    this.sortable.captureAnimationState();
    if (putSortable2) {
      putSortable2.captureAnimationState();
    }
    var nextSibling = getChild(this.sortable.el, this.startIndex, this.options);
    if (nextSibling) {
      this.sortable.el.insertBefore(dragEl2, nextSibling);
    } else {
      this.sortable.el.appendChild(dragEl2);
    }
    this.sortable.animateAll();
    if (putSortable2) {
      putSortable2.animateAll();
    }
  },
  drop
};
_extends(Revert, {
  pluginName: "revertOnSpill"
});
function Remove() {
}
Remove.prototype = {
  onSpill: function onSpill2(_ref4) {
    var dragEl2 = _ref4.dragEl, putSortable2 = _ref4.putSortable;
    var parentSortable = putSortable2 || this.sortable;
    parentSortable.captureAnimationState();
    dragEl2.parentNode && dragEl2.parentNode.removeChild(dragEl2);
    parentSortable.animateAll();
  },
  drop
};
_extends(Remove, {
  pluginName: "removeOnSpill"
});
var multiDragElements = [];
var multiDragClones = [];
var lastMultiDragSelect;
var multiDragSortable;
var initialFolding = false;
var folding = false;
var dragStarted = false;
var dragEl$1;
var clonesFromRect;
var clonesHidden;
function MultiDragPlugin() {
  function MultiDrag(sortable) {
    for (var fn in this) {
      if (fn.charAt(0) === "_" && typeof this[fn] === "function") {
        this[fn] = this[fn].bind(this);
      }
    }
    if (!sortable.options.avoidImplicitDeselect) {
      if (sortable.options.supportPointer) {
        on(document, "pointerup", this._deselectMultiDrag);
      } else {
        on(document, "mouseup", this._deselectMultiDrag);
        on(document, "touchend", this._deselectMultiDrag);
      }
    }
    on(document, "keydown", this._checkKeyDown);
    on(document, "keyup", this._checkKeyUp);
    this.defaults = {
      selectedClass: "sortable-selected",
      multiDragKey: null,
      avoidImplicitDeselect: false,
      setData: function setData(dataTransfer, dragEl2) {
        var data = "";
        if (multiDragElements.length && multiDragSortable === sortable) {
          multiDragElements.forEach(function(multiDragElement, i) {
            data += (!i ? "" : ", ") + multiDragElement.textContent;
          });
        } else {
          data = dragEl2.textContent;
        }
        dataTransfer.setData("Text", data);
      }
    };
  }
  MultiDrag.prototype = {
    multiDragKeyDown: false,
    isMultiDrag: false,
    delayStartGlobal: function delayStartGlobal(_ref) {
      var dragged = _ref.dragEl;
      dragEl$1 = dragged;
    },
    delayEnded: function delayEnded() {
      this.isMultiDrag = ~multiDragElements.indexOf(dragEl$1);
    },
    setupClone: function setupClone(_ref2) {
      var sortable = _ref2.sortable, cancel = _ref2.cancel;
      if (!this.isMultiDrag) return;
      for (var i = 0; i < multiDragElements.length; i++) {
        multiDragClones.push(clone(multiDragElements[i]));
        multiDragClones[i].sortableIndex = multiDragElements[i].sortableIndex;
        multiDragClones[i].draggable = false;
        multiDragClones[i].style["will-change"] = "";
        toggleClass(multiDragClones[i], this.options.selectedClass, false);
        multiDragElements[i] === dragEl$1 && toggleClass(multiDragClones[i], this.options.chosenClass, false);
      }
      sortable._hideClone();
      cancel();
    },
    clone: function clone2(_ref3) {
      var sortable = _ref3.sortable, rootEl2 = _ref3.rootEl, dispatchSortableEvent = _ref3.dispatchSortableEvent, cancel = _ref3.cancel;
      if (!this.isMultiDrag) return;
      if (!this.options.removeCloneOnHide) {
        if (multiDragElements.length && multiDragSortable === sortable) {
          insertMultiDragClones(true, rootEl2);
          dispatchSortableEvent("clone");
          cancel();
        }
      }
    },
    showClone: function showClone(_ref4) {
      var cloneNowShown = _ref4.cloneNowShown, rootEl2 = _ref4.rootEl, cancel = _ref4.cancel;
      if (!this.isMultiDrag) return;
      insertMultiDragClones(false, rootEl2);
      multiDragClones.forEach(function(clone2) {
        css(clone2, "display", "");
      });
      cloneNowShown();
      clonesHidden = false;
      cancel();
    },
    hideClone: function hideClone(_ref5) {
      var _this = this;
      var sortable = _ref5.sortable, cloneNowHidden = _ref5.cloneNowHidden, cancel = _ref5.cancel;
      if (!this.isMultiDrag) return;
      multiDragClones.forEach(function(clone2) {
        css(clone2, "display", "none");
        if (_this.options.removeCloneOnHide && clone2.parentNode) {
          clone2.parentNode.removeChild(clone2);
        }
      });
      cloneNowHidden();
      clonesHidden = true;
      cancel();
    },
    dragStartGlobal: function dragStartGlobal(_ref6) {
      var sortable = _ref6.sortable;
      if (!this.isMultiDrag && multiDragSortable) {
        multiDragSortable.multiDrag._deselectMultiDrag();
      }
      multiDragElements.forEach(function(multiDragElement) {
        multiDragElement.sortableIndex = index(multiDragElement);
      });
      multiDragElements = multiDragElements.sort(function(a, b) {
        return a.sortableIndex - b.sortableIndex;
      });
      dragStarted = true;
    },
    dragStarted: function dragStarted2(_ref7) {
      var _this2 = this;
      var sortable = _ref7.sortable;
      if (!this.isMultiDrag) return;
      if (this.options.sort) {
        sortable.captureAnimationState();
        if (this.options.animation) {
          multiDragElements.forEach(function(multiDragElement) {
            if (multiDragElement === dragEl$1) return;
            css(multiDragElement, "position", "absolute");
          });
          var dragRect = getRect(dragEl$1, false, true, true);
          multiDragElements.forEach(function(multiDragElement) {
            if (multiDragElement === dragEl$1) return;
            setRect(multiDragElement, dragRect);
          });
          folding = true;
          initialFolding = true;
        }
      }
      sortable.animateAll(function() {
        folding = false;
        initialFolding = false;
        if (_this2.options.animation) {
          multiDragElements.forEach(function(multiDragElement) {
            unsetRect(multiDragElement);
          });
        }
        if (_this2.options.sort) {
          removeMultiDragElements();
        }
      });
    },
    dragOver: function dragOver2(_ref8) {
      var target = _ref8.target, completed = _ref8.completed, cancel = _ref8.cancel;
      if (folding && ~multiDragElements.indexOf(target)) {
        completed(false);
        cancel();
      }
    },
    revert: function revert(_ref9) {
      var fromSortable = _ref9.fromSortable, rootEl2 = _ref9.rootEl, sortable = _ref9.sortable, dragRect = _ref9.dragRect;
      if (multiDragElements.length > 1) {
        multiDragElements.forEach(function(multiDragElement) {
          sortable.addAnimationState({
            target: multiDragElement,
            rect: folding ? getRect(multiDragElement) : dragRect
          });
          unsetRect(multiDragElement);
          multiDragElement.fromRect = dragRect;
          fromSortable.removeAnimationState(multiDragElement);
        });
        folding = false;
        insertMultiDragElements(!this.options.removeCloneOnHide, rootEl2);
      }
    },
    dragOverCompleted: function dragOverCompleted(_ref10) {
      var sortable = _ref10.sortable, isOwner = _ref10.isOwner, insertion = _ref10.insertion, activeSortable = _ref10.activeSortable, parentEl2 = _ref10.parentEl, putSortable2 = _ref10.putSortable;
      var options2 = this.options;
      if (insertion) {
        if (isOwner) {
          activeSortable._hideClone();
        }
        initialFolding = false;
        if (options2.animation && multiDragElements.length > 1 && (folding || !isOwner && !activeSortable.options.sort && !putSortable2)) {
          var dragRectAbsolute = getRect(dragEl$1, false, true, true);
          multiDragElements.forEach(function(multiDragElement) {
            if (multiDragElement === dragEl$1) return;
            setRect(multiDragElement, dragRectAbsolute);
            parentEl2.appendChild(multiDragElement);
          });
          folding = true;
        }
        if (!isOwner) {
          if (!folding) {
            removeMultiDragElements();
          }
          if (multiDragElements.length > 1) {
            var clonesHiddenBefore = clonesHidden;
            activeSortable._showClone(sortable);
            if (activeSortable.options.animation && !clonesHidden && clonesHiddenBefore) {
              multiDragClones.forEach(function(clone2) {
                activeSortable.addAnimationState({
                  target: clone2,
                  rect: clonesFromRect
                });
                clone2.fromRect = clonesFromRect;
                clone2.thisAnimationDuration = null;
              });
            }
          } else {
            activeSortable._showClone(sortable);
          }
        }
      }
    },
    dragOverAnimationCapture: function dragOverAnimationCapture(_ref11) {
      var dragRect = _ref11.dragRect, isOwner = _ref11.isOwner, activeSortable = _ref11.activeSortable;
      multiDragElements.forEach(function(multiDragElement) {
        multiDragElement.thisAnimationDuration = null;
      });
      if (activeSortable.options.animation && !isOwner && activeSortable.multiDrag.isMultiDrag) {
        clonesFromRect = _extends({}, dragRect);
        var dragMatrix = matrix(dragEl$1, true);
        clonesFromRect.top -= dragMatrix.f;
        clonesFromRect.left -= dragMatrix.e;
      }
    },
    dragOverAnimationComplete: function dragOverAnimationComplete() {
      if (folding) {
        folding = false;
        removeMultiDragElements();
      }
    },
    drop: function drop4(_ref12) {
      var evt = _ref12.originalEvent, rootEl2 = _ref12.rootEl, parentEl2 = _ref12.parentEl, sortable = _ref12.sortable, dispatchSortableEvent = _ref12.dispatchSortableEvent, oldIndex2 = _ref12.oldIndex, putSortable2 = _ref12.putSortable;
      var toSortable = putSortable2 || this.sortable;
      if (!evt) return;
      var options2 = this.options, children = parentEl2.children;
      if (!dragStarted) {
        if (options2.multiDragKey && !this.multiDragKeyDown) {
          this._deselectMultiDrag();
        }
        toggleClass(dragEl$1, options2.selectedClass, !~multiDragElements.indexOf(dragEl$1));
        if (!~multiDragElements.indexOf(dragEl$1)) {
          multiDragElements.push(dragEl$1);
          dispatchEvent({
            sortable,
            rootEl: rootEl2,
            name: "select",
            targetEl: dragEl$1,
            originalEvent: evt
          });
          if (evt.shiftKey && lastMultiDragSelect && sortable.el.contains(lastMultiDragSelect)) {
            var lastIndex = index(lastMultiDragSelect), currentIndex = index(dragEl$1);
            if (~lastIndex && ~currentIndex && lastIndex !== currentIndex) {
              (function() {
                var n, i;
                if (currentIndex > lastIndex) {
                  i = lastIndex;
                  n = currentIndex;
                } else {
                  i = currentIndex;
                  n = lastIndex + 1;
                }
                var filter = options2.filter;
                for (; i < n; i++) {
                  if (~multiDragElements.indexOf(children[i])) continue;
                  if (!closest(children[i], options2.draggable, parentEl2, false)) continue;
                  var filtered = filter && (typeof filter === "function" ? filter.call(sortable, evt, children[i], sortable) : filter.split(",").some(function(criteria) {
                    return closest(children[i], criteria.trim(), parentEl2, false);
                  }));
                  if (filtered) continue;
                  toggleClass(children[i], options2.selectedClass, true);
                  multiDragElements.push(children[i]);
                  dispatchEvent({
                    sortable,
                    rootEl: rootEl2,
                    name: "select",
                    targetEl: children[i],
                    originalEvent: evt
                  });
                }
              })();
            }
          } else {
            lastMultiDragSelect = dragEl$1;
          }
          multiDragSortable = toSortable;
        } else {
          multiDragElements.splice(multiDragElements.indexOf(dragEl$1), 1);
          lastMultiDragSelect = null;
          dispatchEvent({
            sortable,
            rootEl: rootEl2,
            name: "deselect",
            targetEl: dragEl$1,
            originalEvent: evt
          });
        }
      }
      if (dragStarted && this.isMultiDrag) {
        folding = false;
        if ((parentEl2[expando].options.sort || parentEl2 !== rootEl2) && multiDragElements.length > 1) {
          var dragRect = getRect(dragEl$1), multiDragIndex = index(dragEl$1, ":not(." + this.options.selectedClass + ")");
          if (!initialFolding && options2.animation) dragEl$1.thisAnimationDuration = null;
          toSortable.captureAnimationState();
          if (!initialFolding) {
            if (options2.animation) {
              dragEl$1.fromRect = dragRect;
              multiDragElements.forEach(function(multiDragElement) {
                multiDragElement.thisAnimationDuration = null;
                if (multiDragElement !== dragEl$1) {
                  var rect = folding ? getRect(multiDragElement) : dragRect;
                  multiDragElement.fromRect = rect;
                  toSortable.addAnimationState({
                    target: multiDragElement,
                    rect
                  });
                }
              });
            }
            removeMultiDragElements();
            multiDragElements.forEach(function(multiDragElement) {
              if (children[multiDragIndex]) {
                parentEl2.insertBefore(multiDragElement, children[multiDragIndex]);
              } else {
                parentEl2.appendChild(multiDragElement);
              }
              multiDragIndex++;
            });
            if (oldIndex2 === index(dragEl$1)) {
              var update = false;
              multiDragElements.forEach(function(multiDragElement) {
                if (multiDragElement.sortableIndex !== index(multiDragElement)) {
                  update = true;
                  return;
                }
              });
              if (update) {
                dispatchSortableEvent("update");
                dispatchSortableEvent("sort");
              }
            }
          }
          multiDragElements.forEach(function(multiDragElement) {
            unsetRect(multiDragElement);
          });
          toSortable.animateAll();
        }
        multiDragSortable = toSortable;
      }
      if (rootEl2 === parentEl2 || putSortable2 && putSortable2.lastPutMode !== "clone") {
        multiDragClones.forEach(function(clone2) {
          clone2.parentNode && clone2.parentNode.removeChild(clone2);
        });
      }
    },
    nullingGlobal: function nullingGlobal() {
      this.isMultiDrag = dragStarted = false;
      multiDragClones.length = 0;
    },
    destroyGlobal: function destroyGlobal() {
      this._deselectMultiDrag();
      off(document, "pointerup", this._deselectMultiDrag);
      off(document, "mouseup", this._deselectMultiDrag);
      off(document, "touchend", this._deselectMultiDrag);
      off(document, "keydown", this._checkKeyDown);
      off(document, "keyup", this._checkKeyUp);
    },
    _deselectMultiDrag: function _deselectMultiDrag(evt) {
      if (typeof dragStarted !== "undefined" && dragStarted) return;
      if (multiDragSortable !== this.sortable) return;
      if (evt && closest(evt.target, this.options.draggable, this.sortable.el, false)) return;
      if (evt && evt.button !== 0) return;
      while (multiDragElements.length) {
        var el2 = multiDragElements[0];
        toggleClass(el2, this.options.selectedClass, false);
        multiDragElements.shift();
        dispatchEvent({
          sortable: this.sortable,
          rootEl: this.sortable.el,
          name: "deselect",
          targetEl: el2,
          originalEvent: evt
        });
      }
    },
    _checkKeyDown: function _checkKeyDown(evt) {
      if (evt.key === this.options.multiDragKey) {
        this.multiDragKeyDown = true;
      }
    },
    _checkKeyUp: function _checkKeyUp(evt) {
      if (evt.key === this.options.multiDragKey) {
        this.multiDragKeyDown = false;
      }
    }
  };
  return _extends(MultiDrag, {
    // Static methods & properties
    pluginName: "multiDrag",
    utils: {
      /**
       * Selects the provided multi-drag item
       * @param  {HTMLElement} el    The element to be selected
       */
      select: function select(el2) {
        var sortable = el2.parentNode[expando];
        if (!sortable || !sortable.options.multiDrag || ~multiDragElements.indexOf(el2)) return;
        if (multiDragSortable && multiDragSortable !== sortable) {
          multiDragSortable.multiDrag._deselectMultiDrag();
          multiDragSortable = sortable;
        }
        toggleClass(el2, sortable.options.selectedClass, true);
        multiDragElements.push(el2);
      },
      /**
       * Deselects the provided multi-drag item
       * @param  {HTMLElement} el    The element to be deselected
       */
      deselect: function deselect(el2) {
        var sortable = el2.parentNode[expando], index2 = multiDragElements.indexOf(el2);
        if (!sortable || !sortable.options.multiDrag || !~index2) return;
        toggleClass(el2, sortable.options.selectedClass, false);
        multiDragElements.splice(index2, 1);
      }
    },
    eventProperties: function eventProperties() {
      var _this3 = this;
      var oldIndicies = [], newIndicies = [];
      multiDragElements.forEach(function(multiDragElement) {
        oldIndicies.push({
          multiDragElement,
          index: multiDragElement.sortableIndex
        });
        var newIndex2;
        if (folding && multiDragElement !== dragEl$1) {
          newIndex2 = -1;
        } else if (folding) {
          newIndex2 = index(multiDragElement, ":not(." + _this3.options.selectedClass + ")");
        } else {
          newIndex2 = index(multiDragElement);
        }
        newIndicies.push({
          multiDragElement,
          index: newIndex2
        });
      });
      return {
        items: _toConsumableArray(multiDragElements),
        clones: [].concat(multiDragClones),
        oldIndicies,
        newIndicies
      };
    },
    optionListeners: {
      multiDragKey: function multiDragKey(key) {
        key = key.toLowerCase();
        if (key === "ctrl") {
          key = "Control";
        } else if (key.length > 1) {
          key = key.charAt(0).toUpperCase() + key.substr(1);
        }
        return key;
      }
    }
  });
}
function insertMultiDragElements(clonesInserted, rootEl2) {
  multiDragElements.forEach(function(multiDragElement, i) {
    var target = rootEl2.children[multiDragElement.sortableIndex + (clonesInserted ? Number(i) : 0)];
    if (target) {
      rootEl2.insertBefore(multiDragElement, target);
    } else {
      rootEl2.appendChild(multiDragElement);
    }
  });
}
function insertMultiDragClones(elementsInserted, rootEl2) {
  multiDragClones.forEach(function(clone2, i) {
    var target = rootEl2.children[clone2.sortableIndex + (elementsInserted ? Number(i) : 0)];
    if (target) {
      rootEl2.insertBefore(clone2, target);
    } else {
      rootEl2.appendChild(clone2);
    }
  });
}
function removeMultiDragElements() {
  multiDragElements.forEach(function(multiDragElement) {
    if (multiDragElement === dragEl$1) return;
    multiDragElement.parentNode && multiDragElement.parentNode.removeChild(multiDragElement);
  });
}
Sortable.mount(new AutoScrollPlugin());
Sortable.mount(Remove, Revert);
var sortable_esm_default = Sortable;

// resources/js/components/book-sort.js
var sortOperations = {
  name(a, b) {
    const aName = a.getAttribute("data-name").trim().toLowerCase();
    const bName = b.getAttribute("data-name").trim().toLowerCase();
    return aName.localeCompare(bName);
  },
  created(a, b) {
    const aTime = Number(a.getAttribute("data-created"));
    const bTime = Number(b.getAttribute("data-created"));
    return bTime - aTime;
  },
  updated(a, b) {
    const aTime = Number(a.getAttribute("data-updated"));
    const bTime = Number(b.getAttribute("data-updated"));
    return bTime - aTime;
  },
  chaptersFirst(a, b) {
    const aType = a.getAttribute("data-type");
    const bType = b.getAttribute("data-type");
    if (aType === bType) {
      return 0;
    }
    return aType === "chapter" ? -1 : 1;
  },
  chaptersLast(a, b) {
    const aType = a.getAttribute("data-type");
    const bType = b.getAttribute("data-type");
    if (aType === bType) {
      return 0;
    }
    return aType === "chapter" ? 1 : -1;
  }
};
var moveActions = {
  up: {
    active(elem2, parent) {
      return !(elem2.previousElementSibling === null && !parent);
    },
    run(elem2, parent) {
      const newSibling = elem2.previousElementSibling || parent;
      newSibling.insertAdjacentElement("beforebegin", elem2);
    }
  },
  down: {
    active(elem2, parent) {
      return !(elem2.nextElementSibling === null && !parent);
    },
    run(elem2, parent) {
      const newSibling = elem2.nextElementSibling || parent;
      newSibling.insertAdjacentElement("afterend", elem2);
    }
  },
  next_book: {
    active(elem2, parent, book) {
      return book.nextElementSibling !== null;
    },
    run(elem2, parent, book) {
      const newList = book.nextElementSibling.querySelector("ul");
      newList.prepend(elem2);
    }
  },
  prev_book: {
    active(elem2, parent, book) {
      return book.previousElementSibling !== null;
    },
    run(elem2, parent, book) {
      const newList = book.previousElementSibling.querySelector("ul");
      newList.appendChild(elem2);
    }
  },
  next_chapter: {
    active(elem2, parent) {
      return elem2.dataset.type === "page" && this.getNextChapter(elem2, parent);
    },
    run(elem2, parent) {
      const nextChapter = this.getNextChapter(elem2, parent);
      nextChapter.querySelector("ul").prepend(elem2);
    },
    getNextChapter(elem2, parent) {
      const topLevel = parent || elem2;
      const topItems = Array.from(topLevel.parentElement.children);
      const index2 = topItems.indexOf(topLevel);
      return topItems.slice(index2 + 1).find((item) => item.dataset.type === "chapter");
    }
  },
  prev_chapter: {
    active(elem2, parent) {
      return elem2.dataset.type === "page" && this.getPrevChapter(elem2, parent);
    },
    run(elem2, parent) {
      const prevChapter = this.getPrevChapter(elem2, parent);
      prevChapter.querySelector("ul").append(elem2);
    },
    getPrevChapter(elem2, parent) {
      const topLevel = parent || elem2;
      const topItems = Array.from(topLevel.parentElement.children);
      const index2 = topItems.indexOf(topLevel);
      return topItems.slice(0, index2).reverse().find((item) => item.dataset.type === "chapter");
    }
  },
  book_end: {
    active(elem2, parent) {
      return parent || parent === null && elem2.nextElementSibling;
    },
    run(elem2, parent, book) {
      book.querySelector("ul").append(elem2);
    }
  },
  book_start: {
    active(elem2, parent) {
      return parent || parent === null && elem2.previousElementSibling;
    },
    run(elem2, parent, book) {
      book.querySelector("ul").prepend(elem2);
    }
  },
  before_chapter: {
    active(elem2, parent) {
      return parent;
    },
    run(elem2, parent) {
      parent.insertAdjacentElement("beforebegin", elem2);
    }
  },
  after_chapter: {
    active(elem2, parent) {
      return parent;
    },
    run(elem2, parent) {
      parent.insertAdjacentElement("afterend", elem2);
    }
  }
};
var BookSort = class extends Component {
  setup() {
    this.container = this.$el;
    this.sortContainer = this.$refs.sortContainer;
    this.input = this.$refs.input;
    sortable_esm_default.mount(new MultiDragPlugin());
    const initialSortBox = this.container.querySelector(".sort-box");
    this.setupBookSortable(initialSortBox);
    this.setupSortPresets();
    this.setupMoveActions();
    window.$events.listen("entity-select-change", this.bookSelect.bind(this));
  }
  /**
   * Set up the handlers for the item-level move buttons.
   */
  setupMoveActions() {
    this.container.addEventListener("click", (event) => {
      if (event.target.matches("[data-move]")) {
        const action = event.target.getAttribute("data-move");
        const sortItem = event.target.closest("[data-id]");
        this.runSortAction(sortItem, action);
      }
    });
    this.updateMoveActionStateForAll();
  }
  /**
   * Set up the handlers for the preset sort type buttons.
   */
  setupSortPresets() {
    let lastSort = "";
    let reverse = false;
    const reversibleTypes = ["name", "created", "updated"];
    this.sortContainer.addEventListener("click", (event) => {
      const sortButton = event.target.closest(".sort-box-options [data-sort]");
      if (!sortButton) return;
      event.preventDefault();
      const sortLists = sortButton.closest(".sort-box").querySelectorAll("ul");
      const sort2 = sortButton.getAttribute("data-sort");
      reverse = lastSort === sort2 ? !reverse : false;
      let sortFunction = sortOperations[sort2];
      if (reverse && reversibleTypes.includes(sort2)) {
        sortFunction = function reverseSortOperation(a, b) {
          return 0 - sortOperations[sort2](a, b);
        };
      }
      for (const list of sortLists) {
        const directItems = Array.from(list.children).filter((child) => child.matches("li"));
        directItems.sort(sortFunction).forEach((sortedItem) => {
          list.appendChild(sortedItem);
        });
      }
      lastSort = sort2;
      this.updateMapInput();
    });
  }
  /**
   * Handle book selection from the entity selector.
   * @param {Object} entityInfo
   */
  bookSelect(entityInfo) {
    const alreadyAdded = this.container.querySelector(`[data-type="book"][data-id="${entityInfo.id}"]`) !== null;
    if (alreadyAdded) return;
    const entitySortItemUrl = `${entityInfo.link}/sort-item`;
    window.$http.get(entitySortItemUrl).then((resp) => {
      const newBookContainer = htmlToDom(resp.data);
      this.sortContainer.append(newBookContainer);
      this.setupBookSortable(newBookContainer);
      this.updateMoveActionStateForAll();
      const summary = newBookContainer.querySelector("summary");
      summary.focus();
    });
  }
  /**
   * Set up the given book container element to have sortable items.
   * @param {Element} bookContainer
   */
  setupBookSortable(bookContainer) {
    const sortElems = Array.from(bookContainer.querySelectorAll(".sort-list, .sortable-page-sublist"));
    const bookGroupConfig = {
      name: "book",
      pull: ["book", "chapter"],
      put: ["book", "chapter"]
    };
    const chapterGroupConfig = {
      name: "chapter",
      pull: ["book", "chapter"],
      put(toList, fromList, draggedElem) {
        return draggedElem.getAttribute("data-type") === "page";
      }
    };
    for (const sortElem of sortElems) {
      sortable_esm_default.create(sortElem, {
        group: sortElem.classList.contains("sort-list") ? bookGroupConfig : chapterGroupConfig,
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onSort: () => {
          this.ensureNoNestedChapters();
          this.updateMapInput();
          this.updateMoveActionStateForAll();
        },
        dragClass: "bg-white",
        ghostClass: "primary-background-light",
        multiDrag: true,
        multiDragKey: "Control",
        selectedClass: "sortable-selected"
      });
    }
  }
  /**
   * Handle nested chapters by moving them to the parent book.
   * Needed since sorting with multi-sort only checks group rules based on the active item,
   * not all in group, therefore need to manually check after a sort.
   * Must be done before updating the map input.
   */
  ensureNoNestedChapters() {
    const nestedChapters = this.container.querySelectorAll('[data-type="chapter"] [data-type="chapter"]');
    for (const chapter of nestedChapters) {
      const parentChapter = chapter.parentElement.closest('[data-type="chapter"]');
      parentChapter.insertAdjacentElement("afterend", chapter);
    }
  }
  /**
   * Update the input with our sort data.
   */
  updateMapInput() {
    const pageMap = this.buildEntityMap();
    this.input.value = JSON.stringify(pageMap);
  }
  /**
   * Build up a mapping of entities with their ordering and nesting.
   * @returns {Array}
   */
  buildEntityMap() {
    const entityMap = [];
    const lists = this.container.querySelectorAll(".sort-list");
    for (const list of lists) {
      const bookId = list.closest('[data-type="book"]').getAttribute("data-id");
      const directChildren = Array.from(list.children).filter((elem2) => elem2.matches('[data-type="page"], [data-type="chapter"]'));
      for (let i = 0; i < directChildren.length; i++) {
        this.addBookChildToMap(directChildren[i], i, bookId, entityMap);
      }
    }
    return entityMap;
  }
  /**
   * Parse a sort item and add it to a data-map array.
   * Parses sub0items if existing also.
   * @param {Element} childElem
   * @param {Number} index
   * @param {Number} bookId
   * @param {Array} entityMap
   */
  addBookChildToMap(childElem, index2, bookId, entityMap) {
    const type = childElem.getAttribute("data-type");
    const parentChapter = false;
    const childId = childElem.getAttribute("data-id");
    entityMap.push({
      id: childId,
      sort: index2,
      parentChapter,
      type,
      book: bookId
    });
    const subPages = childElem.querySelectorAll('[data-type="page"]');
    for (let i = 0; i < subPages.length; i++) {
      entityMap.push({
        id: subPages[i].getAttribute("data-id"),
        sort: i,
        parentChapter: childId,
        type: "page",
        book: bookId
      });
    }
  }
  /**
   * Run the given sort action up the provided sort item.
   * @param {Element} item
   * @param {String} action
   */
  runSortAction(item, action) {
    const parentItem = item.parentElement.closest("li[data-id]");
    const parentBook = item.parentElement.closest('[data-type="book"]');
    moveActions[action].run(item, parentItem, parentBook);
    this.updateMapInput();
    this.updateMoveActionStateForAll();
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    item.focus();
  }
  /**
   * Update the state of the available move actions on this item.
   * @param {Element} item
   */
  updateMoveActionState(item) {
    const parentItem = item.parentElement.closest("li[data-id]");
    const parentBook = item.parentElement.closest('[data-type="book"]');
    for (const [action, functions] of Object.entries(moveActions)) {
      const moveButton = item.querySelector(`[data-move="${action}"]`);
      moveButton.disabled = !functions.active(item, parentItem, parentBook);
    }
  }
  updateMoveActionStateForAll() {
    const items = this.container.querySelectorAll('[data-type="chapter"],[data-type="page"]');
    for (const item of items) {
      this.updateMoveActionState(item);
    }
  }
};

// resources/js/services/animations.ts
var animateStylesCleanupMap = /* @__PURE__ */ new WeakMap();
function animateStyles(element, styles, animTime = 400, onComplete = null) {
  const styleNames = Object.keys(styles);
  for (const style of styleNames) {
    element.style.setProperty(style, styles[style][0]);
  }
  const cleanup = () => {
    for (const style of styleNames) {
      element.style.removeProperty(style);
    }
    element.style.removeProperty("transition");
    element.removeEventListener("transitionend", cleanup);
    animateStylesCleanupMap.delete(element);
    if (onComplete) onComplete();
  };
  setTimeout(() => {
    element.style.transition = `all ease-in-out ${animTime}ms`;
    for (const style of styleNames) {
      element.style.setProperty(style, styles[style][1]);
    }
    element.addEventListener("transitionend", cleanup);
    animateStylesCleanupMap.set(element, cleanup);
  }, 15);
}
function cleanupExistingElementAnimation(element) {
  if (animateStylesCleanupMap.has(element)) {
    const oldCleanup = animateStylesCleanupMap.get(element);
    oldCleanup();
  }
}
function fadeIn(element, animTime = 400, onComplete = null) {
  cleanupExistingElementAnimation(element);
  element.style.display = "block";
  animateStyles(element, {
    "opacity": ["0", "1"]
  }, animTime, () => {
    if (onComplete) onComplete();
  });
}
function fadeOut(element, animTime = 400, onComplete = null) {
  cleanupExistingElementAnimation(element);
  animateStyles(element, {
    "opacity": ["1", "0"]
  }, animTime, () => {
    element.style.display = "none";
    if (onComplete) onComplete();
  });
}
function slideUp(element, animTime = 400) {
  cleanupExistingElementAnimation(element);
  const currentHeight = element.getBoundingClientRect().height;
  const computedStyles = getComputedStyle(element);
  const currentPaddingTop = computedStyles.getPropertyValue("padding-top");
  const currentPaddingBottom = computedStyles.getPropertyValue("padding-bottom");
  const animStyles = {
    "max-height": [`${currentHeight}px`, "0px"],
    "overflow": ["hidden", "hidden"],
    "padding-top": [currentPaddingTop, "0px"],
    "padding-bottom": [currentPaddingBottom, "0px"]
  };
  animateStyles(element, animStyles, animTime, () => {
    element.style.display = "none";
  });
}
function slideDown(element, animTime = 400) {
  cleanupExistingElementAnimation(element);
  element.style.display = "block";
  const targetHeight = element.getBoundingClientRect().height;
  const computedStyles = getComputedStyle(element);
  const targetPaddingTop = computedStyles.getPropertyValue("padding-top");
  const targetPaddingBottom = computedStyles.getPropertyValue("padding-bottom");
  const animStyles = {
    "max-height": ["0px", `${targetHeight}px`],
    "overflow": ["hidden", "hidden"],
    "padding-top": ["0px", targetPaddingTop],
    "padding-bottom": ["0px", targetPaddingBottom]
  };
  animateStyles(element, animStyles, animTime);
}
function transitionHeight(element, animTime = 400) {
  const startHeight = element.getBoundingClientRect().height;
  const initialComputedStyles = getComputedStyle(element);
  const startPaddingTop = initialComputedStyles.getPropertyValue("padding-top");
  const startPaddingBottom = initialComputedStyles.getPropertyValue("padding-bottom");
  return () => {
    cleanupExistingElementAnimation(element);
    const targetHeight = element.getBoundingClientRect().height;
    const computedStyles = getComputedStyle(element);
    const targetPaddingTop = computedStyles.getPropertyValue("padding-top");
    const targetPaddingBottom = computedStyles.getPropertyValue("padding-bottom");
    const animStyles = {
      "height": [`${startHeight}px`, `${targetHeight}px`],
      "overflow": ["hidden", "hidden"],
      "padding-top": [startPaddingTop, targetPaddingTop],
      "padding-bottom": [startPaddingBottom, targetPaddingBottom]
    };
    animateStyles(element, animStyles, animTime);
  };
}

// resources/js/components/chapter-contents.js
var ChapterContents = class extends Component {
  setup() {
    this.list = this.$refs.list;
    this.toggle = this.$refs.toggle;
    this.isOpen = this.toggle.classList.contains("open");
    this.toggle.addEventListener("click", this.click.bind(this));
  }
  open() {
    this.toggle.classList.add("open");
    this.toggle.setAttribute("aria-expanded", "true");
    slideDown(this.list, 180);
    this.isOpen = true;
  }
  close() {
    this.toggle.classList.remove("open");
    this.toggle.setAttribute("aria-expanded", "false");
    slideUp(this.list, 180);
    this.isOpen = false;
  }
  click(event) {
    event.preventDefault();
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
};

// resources/js/components/code-editor.js
var CodeEditor = class extends Component {
  constructor() {
    super(...arguments);
    /**
     * @type {null|SimpleEditorInterface}
     */
    __publicField(this, "editor", null);
    /**
     * @type {?Function}
     */
    __publicField(this, "saveCallback", null);
    /**
     * @type {?Function}
     */
    __publicField(this, "cancelCallback", null);
    __publicField(this, "history", {});
    __publicField(this, "historyKey", "code_history");
  }
  setup() {
    this.container = this.$refs.container;
    this.popup = this.$el;
    this.editorInput = this.$refs.editor;
    this.languageButtons = this.$manyRefs.languageButton;
    this.languageOptionsContainer = this.$refs.languageOptionsContainer;
    this.saveButton = this.$refs.saveButton;
    this.languageInput = this.$refs.languageInput;
    this.historyDropDown = this.$refs.historyDropDown;
    this.historyList = this.$refs.historyList;
    this.favourites = new Set(this.$opts.favourites.split(","));
    this.setupListeners();
    this.setupFavourites();
  }
  setupListeners() {
    this.container.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "Enter") {
        this.save();
      }
    });
    onSelect(this.languageButtons, (event) => {
      const language = event.target.dataset.lang;
      this.languageInput.value = language;
      this.languageInputChange(language);
    });
    onEnterPress(this.languageInput, () => this.save());
    this.languageInput.addEventListener("input", () => this.languageInputChange(this.languageInput.value));
    onSelect(this.saveButton, () => this.save());
    onChildEvent(this.historyList, "button", "click", (event, elem2) => {
      event.preventDefault();
      const historyTime = elem2.dataset.time;
      if (this.editor) {
        this.editor.setContent(this.history[historyTime]);
      }
    });
  }
  setupFavourites() {
    for (const button of this.languageButtons) {
      this.setupFavouritesForButton(button);
    }
    this.sortLanguageList();
  }
  /**
   * @param {HTMLButtonElement} button
   */
  setupFavouritesForButton(button) {
    const language = button.dataset.lang;
    let isFavorite = this.favourites.has(language);
    button.setAttribute("data-favourite", isFavorite ? "true" : "false");
    onChildEvent(button.parentElement, ".lang-option-favorite-toggle", "click", () => {
      isFavorite = !isFavorite;
      if (isFavorite) {
        this.favourites.add(language);
      } else {
        this.favourites.delete(language);
      }
      button.setAttribute("data-favourite", isFavorite ? "true" : "false");
      window.$http.patch("/preferences/update-code-language-favourite", {
        language,
        active: isFavorite
      });
      this.sortLanguageList();
      if (isFavorite) {
        button.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }
  sortLanguageList() {
    const sortedParents = this.languageButtons.sort((a, b) => {
      const aFav = a.dataset.favourite === "true";
      const bFav = b.dataset.favourite === "true";
      if (aFav && !bFav) {
        return -1;
      }
      if (bFav && !aFav) {
        return 1;
      }
      return a.dataset.lang > b.dataset.lang ? 1 : -1;
    }).map((button) => button.parentElement);
    for (const parent of sortedParents) {
      this.languageOptionsContainer.append(parent);
    }
  }
  save() {
    if (this.saveCallback) {
      this.saveCallback(this.editor.getContent(), this.languageInput.value);
    }
    this.hide();
  }
  async open(code, language, direction, saveCallback, cancelCallback) {
    this.languageInput.value = language;
    this.saveCallback = saveCallback;
    this.cancelCallback = cancelCallback;
    await this.show();
    this.languageInputChange(language);
    this.editor.setContent(code);
    this.setDirection(direction);
  }
  async show() {
    const Code2 = await window.importVersioned("code");
    if (!this.editor) {
      this.editor = Code2.popupEditor(this.editorInput, this.languageInput.value);
    }
    this.loadHistory();
    this.getPopup().show(() => {
      this.editor.focus();
    }, () => {
      this.addHistory();
      if (this.cancelCallback) {
        this.cancelCallback();
      }
    });
  }
  setDirection(direction) {
    const target = this.editorInput.parentElement;
    if (direction) {
      target.setAttribute("dir", direction);
    } else {
      target.removeAttribute("dir");
    }
  }
  hide() {
    this.getPopup().hide();
    this.addHistory();
  }
  /**
   * @returns {Popup}
   */
  getPopup() {
    return window.$components.firstOnElement(this.popup, "popup");
  }
  async updateEditorMode(language) {
    this.editor.setMode(language, this.editor.getContent());
  }
  languageInputChange(language) {
    this.updateEditorMode(language);
    const inputLang = language.toLowerCase();
    for (const link of this.languageButtons) {
      const lang = link.dataset.lang.toLowerCase().trim();
      const isMatch = inputLang === lang;
      link.classList.toggle("active", isMatch);
      if (isMatch) {
        link.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }
  loadHistory() {
    this.history = JSON.parse(window.sessionStorage.getItem(this.historyKey) || "{}");
    const historyKeys = Object.keys(this.history).reverse();
    this.historyDropDown.classList.toggle("hidden", historyKeys.length === 0);
    this.historyList.innerHTML = historyKeys.map((key) => {
      const localTime = new Date(parseInt(key, 10)).toLocaleTimeString();
      return `<li><button type="button" data-time="${key}" class="text-item">${localTime}</button></li>`;
    }).join("");
  }
  addHistory() {
    if (!this.editor) return;
    const code = this.editor.getContent();
    if (!code) return;
    const lastHistoryKey = Object.keys(this.history).pop();
    if (this.history[lastHistoryKey] === code) return;
    this.history[String(Date.now())] = code;
    const historyString = JSON.stringify(this.history);
    window.sessionStorage.setItem(this.historyKey, historyString);
  }
};

// resources/js/components/code-highlighter.js
var CodeHighlighter = class extends Component {
  setup() {
    const container = this.$el;
    const codeBlocks = container.querySelectorAll("pre");
    if (codeBlocks.length > 0) {
      window.importVersioned("code").then((Code2) => {
        Code2.highlightWithin(container);
      });
    }
  }
};

// resources/js/components/code-textarea.js
var CodeTextarea = class extends Component {
  async setup() {
    const { mode } = this.$opts;
    const Code2 = await window.importVersioned("code");
    Code2.inlineEditor(this.$el, mode);
  }
};

// resources/js/components/collapsible.js
var Collapsible = class extends Component {
  setup() {
    this.container = this.$el;
    this.trigger = this.$refs.trigger;
    this.content = this.$refs.content;
    if (this.trigger) {
      this.trigger.addEventListener("click", this.toggle.bind(this));
      this.openIfContainsError();
    }
  }
  open() {
    this.container.classList.add("open");
    this.trigger.setAttribute("aria-expanded", "true");
    slideDown(this.content, 300);
  }
  close() {
    this.container.classList.remove("open");
    this.trigger.setAttribute("aria-expanded", "false");
    slideUp(this.content, 300);
  }
  toggle() {
    if (this.container.classList.contains("open")) {
      this.close();
    } else {
      this.open();
    }
  }
  openIfContainsError() {
    const error = this.content.querySelector(".text-neg.text-small");
    if (error) {
      this.open();
    }
  }
};

// resources/js/components/confirm-dialog.js
var ConfirmDialog = class extends Component {
  setup() {
    this.container = this.$el;
    this.confirmButton = this.$refs.confirm;
    this.res = null;
    onSelect(this.confirmButton, () => {
      this.sendResult(true);
      this.getPopup().hide();
    });
  }
  show() {
    this.getPopup().show(null, () => {
      this.sendResult(false);
    });
    return new Promise((res) => {
      this.res = res;
    });
  }
  /**
   * @returns {Popup}
   */
  getPopup() {
    return window.$components.firstOnElement(this.container, "popup");
  }
  /**
   * @param {Boolean} result
   */
  sendResult(result) {
    if (this.res) {
      this.res(result);
      this.res = null;
    }
  }
};

// resources/js/components/custom-checkbox.js
var CustomCheckbox = class extends Component {
  setup() {
    this.container = this.$el;
    this.checkbox = this.container.querySelector("input[type=checkbox]");
    this.display = this.container.querySelector('[role="checkbox"]');
    this.checkbox.addEventListener("change", this.stateChange.bind(this));
    this.container.addEventListener("keydown", this.onKeyDown.bind(this));
  }
  onKeyDown(event) {
    const isEnterOrSpace = event.key === " " || event.key === "Enter";
    if (isEnterOrSpace) {
      event.preventDefault();
      this.toggle();
    }
  }
  toggle() {
    this.checkbox.checked = !this.checkbox.checked;
    this.checkbox.dispatchEvent(new Event("change"));
    this.stateChange();
  }
  stateChange() {
    const checked = this.checkbox.checked ? "true" : "false";
    this.display.setAttribute("aria-checked", checked);
  }
};

// resources/js/components/details-highlighter.js
var DetailsHighlighter = class extends Component {
  setup() {
    this.container = this.$el;
    this.dealtWith = false;
    this.container.addEventListener("toggle", this.onToggle.bind(this));
  }
  onToggle() {
    if (this.dealtWith) return;
    if (this.container.querySelector("pre")) {
      window.importVersioned("code").then((Code2) => {
        Code2.highlightWithin(this.container);
      });
    }
    this.dealtWith = true;
  }
};

// resources/js/components/dropdown.js
var Dropdown = class extends Component {
  setup() {
    this.container = this.$el;
    this.menu = this.$refs.menu;
    this.toggle = this.$refs.toggle;
    this.moveMenu = this.$opts.moveMenu;
    this.bubbleEscapes = this.$opts.bubbleEscapes === "true";
    this.direction = document.dir === "rtl" ? "right" : "left";
    this.body = document.body;
    this.showing = false;
    this.hide = this.hide.bind(this);
    this.setupListeners();
  }
  show(event = null) {
    this.hideAll();
    this.menu.style.display = "block";
    this.menu.classList.add("anim", "menuIn");
    this.toggle.setAttribute("aria-expanded", "true");
    const menuOriginalRect = this.menu.getBoundingClientRect();
    let heightOffset = 0;
    const toggleHeight = this.toggle.getBoundingClientRect().height;
    const containerBounds = findClosestScrollContainer(this.menu).getBoundingClientRect();
    const dropUpwards = menuOriginalRect.bottom > containerBounds.bottom;
    const containerRect = this.container.getBoundingClientRect();
    if (this.moveMenu) {
      this.body.appendChild(this.menu);
      this.menu.style.position = "fixed";
      this.menu.style.width = `${menuOriginalRect.width}px`;
      this.menu.style.left = `${menuOriginalRect.left}px`;
      if (dropUpwards) {
        heightOffset = window.innerHeight - menuOriginalRect.top - toggleHeight / 2;
      } else {
        heightOffset = menuOriginalRect.top;
      }
    }
    if (dropUpwards) {
      this.menu.style.top = "initial";
      this.menu.style.bottom = `${heightOffset}px`;
      const maxHeight = window.innerHeight - 40 - (window.innerHeight - containerRect.bottom);
      this.menu.style.maxHeight = `${Math.floor(maxHeight)}px`;
    } else {
      this.menu.style.top = `${heightOffset}px`;
      this.menu.style.bottom = "initial";
      const maxHeight = window.innerHeight - 40 - containerRect.top;
      this.menu.style.maxHeight = `${Math.floor(maxHeight)}px`;
    }
    this.menu.addEventListener("mouseleave", this.hide);
    window.addEventListener("click", (clickEvent) => {
      if (!this.menu.contains(clickEvent.target)) {
        this.hide();
      }
    });
    const input = this.menu.querySelector("input");
    if (input !== null) input.focus();
    this.showing = true;
    const showEvent = new Event("show");
    this.container.dispatchEvent(showEvent);
    if (event) {
      event.stopPropagation();
    }
  }
  hideAll() {
    for (const dropdown of window.$components.get("dropdown")) {
      dropdown.hide();
    }
  }
  hide() {
    this.menu.style.display = "none";
    this.menu.classList.remove("anim", "menuIn");
    this.toggle.setAttribute("aria-expanded", "false");
    this.menu.style.top = "";
    this.menu.style.bottom = "";
    this.menu.style.maxHeight = "";
    if (this.moveMenu) {
      this.menu.style.position = "";
      this.menu.style[this.direction] = "";
      this.menu.style.width = "";
      this.menu.style.left = "";
      this.container.appendChild(this.menu);
    }
    this.showing = false;
  }
  setupListeners() {
    const keyboardNavHandler = new KeyboardNavigationHandler(this.container, (event) => {
      this.hide();
      this.toggle.focus();
      if (!this.bubbleEscapes) {
        event.stopPropagation();
      }
    }, (event) => {
      if (event.target.nodeName === "INPUT") {
        event.preventDefault();
        event.stopPropagation();
      }
      this.hide();
    });
    if (this.moveMenu) {
      keyboardNavHandler.shareHandlingToEl(this.menu);
    }
    this.container.addEventListener("click", (event) => {
      const possibleChildren = Array.from(this.menu.querySelectorAll("a"));
      if (possibleChildren.includes(event.target)) {
        this.hide();
      }
    });
    onSelect(this.toggle, (event) => {
      event.stopPropagation();
      event.preventDefault();
      this.show(event);
      if (event instanceof KeyboardEvent) {
        keyboardNavHandler.focusNext();
      }
    });
  }
};

// resources/js/components/dropdown-search.js
var DropdownSearch = class extends Component {
  setup() {
    this.elem = this.$el;
    this.searchInput = this.$refs.searchInput;
    this.loadingElem = this.$refs.loading;
    this.listContainerElem = this.$refs.listContainer;
    this.localSearchSelector = this.$opts.localSearchSelector;
    this.url = this.$opts.url;
    this.elem.addEventListener("show", this.onShow.bind(this));
    this.searchInput.addEventListener("input", this.onSearch.bind(this));
    this.runAjaxSearch = debounce(this.runAjaxSearch, 300, false);
  }
  onShow() {
    this.loadList();
  }
  onSearch() {
    const input = this.searchInput.value.toLowerCase().trim();
    if (this.localSearchSelector) {
      this.runLocalSearch(input);
    } else {
      this.toggleLoading(true);
      this.listContainerElem.innerHTML = "";
      this.runAjaxSearch(input);
    }
  }
  runAjaxSearch(searchTerm) {
    this.loadList(searchTerm);
  }
  runLocalSearch(searchTerm) {
    const listItems = this.listContainerElem.querySelectorAll(this.localSearchSelector);
    for (const listItem of listItems) {
      const match = !searchTerm || listItem.textContent.toLowerCase().includes(searchTerm);
      listItem.style.display = match ? "flex" : "none";
      listItem.classList.toggle("hidden", !match);
    }
  }
  async loadList(searchTerm = "") {
    this.listContainerElem.innerHTML = "";
    this.toggleLoading(true);
    try {
      const resp = await window.$http.get(this.getAjaxUrl(searchTerm));
      const animate = transitionHeight(this.listContainerElem, 80);
      this.listContainerElem.innerHTML = resp.data;
      animate();
    } catch (err) {
      console.error(err);
    }
    this.toggleLoading(false);
    if (this.localSearchSelector) {
      this.onSearch();
    }
  }
  getAjaxUrl(searchTerm = null) {
    if (!searchTerm) {
      return this.url;
    }
    const joiner = this.url.includes("?") ? "&" : "?";
    return `${this.url}${joiner}search=${encodeURIComponent(searchTerm)}`;
  }
  toggleLoading(show2 = false) {
    this.loadingElem.style.display = show2 ? "block" : "none";
  }
};

// resources/js/services/clipboard.ts
var Clipboard = class {
  constructor(clipboardData) {
    __publicField(this, "data");
    this.data = clipboardData;
  }
  /**
   * Check if the clipboard has any items.
   */
  hasItems() {
    return Boolean(this.data) && Boolean(this.data.types) && this.data.types.length > 0;
  }
  /**
   * Check if the given event has tabular-looking data in the clipboard.
   */
  containsTabularData() {
    const rtfData = this.data.getData("text/rtf");
    return !!rtfData && rtfData.includes("\\trowd");
  }
  /**
   * Get the images that are in the clipboard data.
   */
  getImages() {
    return this.getFiles().filter((f) => f.type.includes("image"));
  }
  /**
   * Get the files included in the clipboard data.
   */
  getFiles() {
    const { files } = this.data;
    return [...files];
  }
};
async function copyTextToClipboard(text) {
  if (window.isSecureContext && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const tempInput = document.createElement("textarea");
  tempInput.setAttribute("style", "position: absolute; left: -1000px; top: -1000px;");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
}

// resources/js/components/dropzone.js
var Dropzone = class extends Component {
  setup() {
    this.container = this.$el;
    this.statusArea = this.$refs.statusArea;
    this.dropTarget = this.$refs.dropTarget;
    this.selectButtons = this.$manyRefs.selectButton || [];
    this.isActive = true;
    this.url = this.$opts.url;
    this.method = (this.$opts.method || "post").toUpperCase();
    this.successMessage = this.$opts.successMessage;
    this.errorMessage = this.$opts.errorMessage;
    this.uploadLimitMb = Number(this.$opts.uploadLimit);
    this.uploadLimitMessage = this.$opts.uploadLimitMessage;
    this.zoneText = this.$opts.zoneText;
    this.fileAcceptTypes = this.$opts.fileAccept;
    this.allowMultiple = this.$opts.allowMultiple === "true";
    this.setupListeners();
  }
  /**
   * Public method to allow external disabling/enabling of this drag+drop dropzone.
   * @param {Boolean} active
   */
  toggleActive(active) {
    this.isActive = active;
  }
  setupListeners() {
    onSelect(this.selectButtons, this.manualSelectHandler.bind(this));
    this.setupDropTargetHandlers();
  }
  setupDropTargetHandlers() {
    let depth = 0;
    const reset = () => {
      this.hideOverlay();
      depth = 0;
    };
    this.dropTarget.addEventListener("dragenter", (event) => {
      event.preventDefault();
      depth += 1;
      if (depth === 1 && this.isActive) {
        this.showOverlay();
      }
    });
    this.dropTarget.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    this.dropTarget.addEventListener("dragend", reset);
    this.dropTarget.addEventListener("dragleave", () => {
      depth -= 1;
      if (depth === 0) {
        reset();
      }
    });
    this.dropTarget.addEventListener("drop", (event) => {
      event.preventDefault();
      reset();
      if (!this.isActive) {
        return;
      }
      const clipboard = new Clipboard(event.dataTransfer);
      const files = clipboard.getFiles();
      for (const file of files) {
        this.createUploadFromFile(file);
      }
    });
  }
  manualSelectHandler() {
    const input = elem("input", {
      type: "file",
      style: "left: -400px; visibility: hidden; position: fixed;",
      accept: this.fileAcceptTypes,
      multiple: this.allowMultiple ? "" : null
    });
    this.container.append(input);
    input.click();
    input.addEventListener("change", () => {
      for (const file of input.files) {
        this.createUploadFromFile(file);
      }
      input.remove();
    });
  }
  showOverlay() {
    const overlay = this.dropTarget.querySelector(".dropzone-overlay");
    if (!overlay) {
      const zoneElem = elem("div", { class: "dropzone-overlay" }, [this.zoneText]);
      this.dropTarget.append(zoneElem);
    }
  }
  hideOverlay() {
    const overlay = this.dropTarget.querySelector(".dropzone-overlay");
    if (overlay) {
      overlay.remove();
    }
  }
  /**
   * @param {File} file
   * @return {Upload}
   */
  createUploadFromFile(file) {
    const {
      dom,
      status,
      progress,
      dismiss
    } = this.createDomForFile(file);
    this.statusArea.append(dom);
    const component = this;
    const upload2 = {
      file,
      dom,
      updateProgress(percentComplete) {
        progress.textContent = `${percentComplete}%`;
        progress.style.width = `${percentComplete}%`;
      },
      markError(message) {
        status.setAttribute("data-status", "error");
        status.textContent = message;
        removeLoading(dom);
        this.updateProgress(100);
      },
      markSuccess(message) {
        status.setAttribute("data-status", "success");
        status.textContent = message;
        removeLoading(dom);
        setTimeout(dismiss, 2400);
        component.$emit("upload-success", {
          name: file.name
        });
      }
    };
    if (file.size > this.uploadLimitMb * 1e6) {
      upload2.markError(this.uploadLimitMessage);
      return upload2;
    }
    this.startXhrForUpload(upload2);
    return upload2;
  }
  /**
   * @param {Upload} upload
   */
  startXhrForUpload(upload2) {
    const formData = new FormData();
    formData.append("file", upload2.file, upload2.file.name);
    if (this.method !== "POST") {
      formData.append("_method", this.method);
    }
    const component = this;
    const req = window.$http.createXMLHttpRequest("POST", this.url, {
      error() {
        upload2.markError(component.errorMessage);
      },
      readystatechange() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
          upload2.markSuccess(component.successMessage);
        } else if (this.readyState === XMLHttpRequest.DONE && this.status >= 400) {
          upload2.markError(window.$http.formatErrorResponseText(this.responseText));
        }
      }
    });
    req.upload.addEventListener("progress", (evt) => {
      const percent = Math.min(Math.ceil(evt.loaded / evt.total * 100), 100);
      upload2.updateProgress(percent);
    });
    req.setRequestHeader("Accept", "application/json");
    req.send(formData);
  }
  /**
   * @param {File} file
   * @return {{image: Element, dom: Element, progress: Element, status: Element, dismiss: function}}
   */
  createDomForFile(file) {
    const image = elem("img", { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9.224 7.373a.924.924 0 0 0-.92.925l-.006 7.404c0 .509.412.925.921.925h5.557a.928.928 0 0 0 .926-.925v-5.553l-2.777-2.776Zm3.239 3.239V8.067l2.545 2.545z' style='fill:%23000;fill-opacity:.75'/%3E%3C/svg%3E" });
    const status = elem("div", { class: "dropzone-file-item-status" }, []);
    const progress = elem("div", { class: "dropzone-file-item-progress" });
    const imageWrap = elem("div", { class: "dropzone-file-item-image-wrap" }, [image]);
    const dom = elem("div", { class: "dropzone-file-item" }, [
      imageWrap,
      elem("div", { class: "dropzone-file-item-text-wrap" }, [
        elem("div", { class: "dropzone-file-item-label" }, [file.name]),
        getLoading(),
        status
      ]),
      progress
    ]);
    if (file.type.startsWith("image/")) {
      image.src = URL.createObjectURL(file);
    }
    const dismiss = () => {
      dom.classList.add("dismiss");
      dom.addEventListener("animationend", () => {
        dom.remove();
      });
    };
    dom.addEventListener("click", dismiss);
    return {
      dom,
      progress,
      status,
      dismiss
    };
  }
};

// resources/js/components/editor-toolbox.ts
var EditorToolbox = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "container");
    __publicField(this, "buttons");
    __publicField(this, "contentElements");
    __publicField(this, "toggleButton");
    __publicField(this, "editorWrapEl");
    __publicField(this, "open", false);
    __publicField(this, "tab", "");
  }
  setup() {
    this.container = this.$el;
    this.buttons = this.$manyRefs.tabButton;
    this.contentElements = this.$manyRefs.tabContent;
    this.toggleButton = this.$refs.toggle;
    this.editorWrapEl = this.container.closest(".page-editor");
    this.setupListeners();
    this.setActiveTab(this.contentElements[0].dataset.tabContent || "");
  }
  setupListeners() {
    this.toggleButton.addEventListener("click", () => this.toggle());
    this.container.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button instanceof HTMLButtonElement && this.buttons.includes(button)) {
        const name = button.dataset.tab || "";
        this.setActiveTab(name, true);
      }
    });
  }
  toggle() {
    this.container.classList.toggle("open");
    const isOpen = this.container.classList.contains("open");
    this.toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    this.editorWrapEl.classList.toggle("toolbox-open", isOpen);
    this.open = isOpen;
    this.emitState();
  }
  setActiveTab(tabName, openToolbox = false) {
    for (const button of this.buttons) {
      button.classList.remove("active");
      const bName = button.dataset.tab;
      if (bName === tabName) button.classList.add("active");
    }
    for (const contentEl of this.contentElements) {
      contentEl.style.display = "none";
      const cName = contentEl.dataset.tabContent;
      if (cName === tabName) contentEl.style.display = "block";
    }
    if (openToolbox && !this.container.classList.contains("open")) {
      this.toggle();
    }
    this.tab = tabName;
    this.emitState();
  }
  emitState() {
    const data = { tab: this.tab, open: this.open };
    this.$emit("change", data);
  }
};

// resources/js/components/entity-permissions.js
var EntityPermissions = class extends Component {
  setup() {
    this.container = this.$el;
    this.entityType = this.$opts.entityType;
    this.everyoneInheritToggle = this.$refs.everyoneInherit;
    this.roleSelect = this.$refs.roleSelect;
    this.roleContainer = this.$refs.roleContainer;
    this.setupListeners();
  }
  setupListeners() {
    this.everyoneInheritToggle.addEventListener("change", (event) => {
      const inherit = event.target.checked;
      const permissions = document.querySelectorAll('input[name^="permissions[0]["]');
      for (const permission of permissions) {
        permission.disabled = inherit;
        permission.checked = false;
      }
    });
    this.container.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button && button.dataset.roleId) {
        this.removeRowOnButtonClick(button);
      }
    });
    this.roleSelect.addEventListener("change", () => {
      const roleId = this.roleSelect.value;
      if (roleId) {
        this.addRoleRow(roleId);
      }
    });
  }
  async addRoleRow(roleId) {
    this.roleSelect.disabled = true;
    const option2 = this.roleSelect.querySelector(`option[value="${roleId}"]`);
    if (option2) {
      option2.remove();
    }
    const resp = await window.$http.get(`/permissions/form-row/${this.entityType}/${roleId}`);
    const row = htmlToDom(resp.data);
    this.roleContainer.append(row);
    this.roleSelect.disabled = false;
  }
  removeRowOnButtonClick(button) {
    const row = button.closest(".item-list-row");
    const { roleId } = button.dataset;
    const { roleName } = button.dataset;
    const option2 = document.createElement("option");
    option2.value = roleId;
    option2.textContent = roleName;
    this.roleSelect.append(option2);
    row.remove();
  }
};

// resources/js/components/entity-search.js
var EntitySearch = class extends Component {
  setup() {
    this.entityId = this.$opts.entityId;
    this.entityType = this.$opts.entityType;
    this.contentView = this.$refs.contentView;
    this.searchView = this.$refs.searchView;
    this.searchResults = this.$refs.searchResults;
    this.searchInput = this.$refs.searchInput;
    this.searchForm = this.$refs.searchForm;
    this.clearButton = this.$refs.clearButton;
    this.loadingBlock = this.$refs.loadingBlock;
    this.setupListeners();
  }
  setupListeners() {
    this.searchInput.addEventListener("change", this.runSearch.bind(this));
    this.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.runSearch();
    });
    onSelect(this.clearButton, this.clearSearch.bind(this));
  }
  runSearch() {
    const term = this.searchInput.value.trim();
    if (term.length === 0) {
      this.clearSearch();
      return;
    }
    this.searchView.classList.remove("hidden");
    this.contentView.classList.add("hidden");
    this.loadingBlock.classList.remove("hidden");
    const url = window.baseUrl(`/search/${this.entityType}/${this.entityId}`);
    window.$http.get(url, { term }).then((resp) => {
      this.searchResults.innerHTML = resp.data;
    }).catch(console.error).then(() => {
      this.loadingBlock.classList.add("hidden");
    });
  }
  clearSearch() {
    this.searchView.classList.add("hidden");
    this.contentView.classList.remove("hidden");
    this.loadingBlock.classList.add("hidden");
    this.searchInput.value = "";
  }
};

// resources/js/components/entity-selector.ts
var EntitySelector = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "elem");
    __publicField(this, "input");
    __publicField(this, "searchInput");
    __publicField(this, "loading");
    __publicField(this, "resultsContainer");
    __publicField(this, "searchOptions");
    __publicField(this, "search", "");
    __publicField(this, "lastClick", 0);
  }
  setup() {
    this.elem = this.$el;
    this.input = this.$refs.input;
    this.searchInput = this.$refs.search;
    this.loading = this.$refs.loading;
    this.resultsContainer = this.$refs.results;
    this.searchOptions = {
      entityTypes: this.$opts.entityTypes || "page,book,chapter",
      entityPermission: this.$opts.entityPermission || "view",
      searchEndpoint: this.$opts.searchEndpoint || "",
      initialValue: this.searchInput.value || ""
    };
    this.setupListeners();
    this.showLoading();
    if (this.searchOptions.searchEndpoint) {
      this.initialLoad();
    }
  }
  configureSearchOptions(options2) {
    Object.assign(this.searchOptions, options2);
    this.reset();
    this.searchInput.value = this.searchOptions.initialValue;
  }
  setupListeners() {
    this.elem.addEventListener("click", this.onClick.bind(this));
    let lastSearch = 0;
    this.searchInput.addEventListener("input", () => {
      lastSearch = Date.now();
      this.showLoading();
      setTimeout(() => {
        if (Date.now() - lastSearch < 199) return;
        this.searchEntities(this.searchInput.value);
      }, 200);
    });
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.keyCode === 13) event.preventDefault();
    });
    onChildEvent(this.$el, "[data-entity-type]", "keydown", (event) => {
      if (event.ctrlKey && event.code === "Enter") {
        const form = this.$el.closest("form");
        if (form) {
          form.submit();
          event.preventDefault();
          return;
        }
      }
      if (event.code === "ArrowDown") {
        this.focusAdjacent(true);
      }
      if (event.code === "ArrowUp") {
        this.focusAdjacent(false);
      }
    });
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.code === "ArrowDown") {
        this.focusAdjacent(true);
      }
    });
  }
  focusAdjacent(forward = true) {
    const items = Array.from(this.resultsContainer.querySelectorAll("[data-entity-type]"));
    const selectedIndex = items.indexOf(document.activeElement);
    const newItem = items[selectedIndex + (forward ? 1 : -1)] || items[0];
    if (newItem instanceof HTMLElement) {
      newItem.focus();
    }
  }
  reset() {
    this.searchInput.value = "";
    this.showLoading();
    this.initialLoad();
  }
  focusSearch() {
    this.searchInput.focus();
  }
  showLoading() {
    this.loading.style.display = "block";
    this.resultsContainer.style.display = "none";
  }
  hideLoading() {
    this.loading.style.display = "none";
    this.resultsContainer.style.display = "block";
  }
  initialLoad() {
    if (!this.searchOptions.searchEndpoint) {
      throw new Error("Search endpoint not set for entity-selector load");
    }
    if (this.searchOptions.initialValue) {
      this.searchEntities(this.searchOptions.initialValue);
      return;
    }
    window.$http.get(this.searchUrl()).then((resp) => {
      this.resultsContainer.innerHTML = resp.data;
      this.hideLoading();
    });
  }
  searchUrl() {
    const query = `types=${encodeURIComponent(this.searchOptions.entityTypes)}&permission=${encodeURIComponent(this.searchOptions.entityPermission)}`;
    return `${this.searchOptions.searchEndpoint}?${query}`;
  }
  searchEntities(searchTerm) {
    if (!this.searchOptions.searchEndpoint) {
      throw new Error("Search endpoint not set for entity-selector load");
    }
    this.input.value = "";
    const url = `${this.searchUrl()}&term=${encodeURIComponent(searchTerm)}`;
    window.$http.get(url).then((resp) => {
      this.resultsContainer.innerHTML = resp.data;
      this.hideLoading();
    });
  }
  isDoubleClick() {
    const now = Date.now();
    const answer = now - this.lastClick < 300;
    this.lastClick = now;
    return answer;
  }
  onClick(event) {
    const listItem = event.target.closest("[data-entity-type]");
    if (listItem instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      this.selectItem(listItem);
    }
  }
  selectItem(item) {
    const isDblClick = this.isDoubleClick();
    const type = item.getAttribute("data-entity-type");
    const id = item.getAttribute("data-entity-id");
    const isSelected = !item.classList.contains("selected") || isDblClick;
    this.unselectAll();
    this.input.value = isSelected ? `${type}:${id}` : "";
    const link = item.getAttribute("href") || "";
    const name = item.querySelector(".entity-list-item-name")?.textContent || "";
    const data = { id: Number(id), name, link };
    if (isSelected) {
      item.classList.add("selected");
    } else {
      window.$events.emit("entity-select-change");
    }
    if (!isDblClick && !isSelected) return;
    if (isDblClick) {
      this.confirmSelection(data);
    }
    if (isSelected) {
      window.$events.emit("entity-select-change", data);
    }
  }
  confirmSelection(data) {
    window.$events.emit("entity-select-confirm", data);
  }
  unselectAll() {
    const selected = this.elem.querySelectorAll(".selected");
    for (const selectedElem of selected) {
      selectedElem.classList.remove("selected", "primary-background");
    }
  }
};

// resources/js/components/entity-selector-popup.ts
var EntitySelectorPopup = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "container");
    __publicField(this, "selectButton");
    __publicField(this, "selectorEl");
    __publicField(this, "callback", null);
    __publicField(this, "selection", null);
  }
  setup() {
    this.container = this.$el;
    this.selectButton = this.$refs.select;
    this.selectorEl = this.$refs.selector;
    this.selectButton.addEventListener("click", this.onSelectButtonClick.bind(this));
    window.$events.listen("entity-select-change", this.onSelectionChange.bind(this));
    window.$events.listen("entity-select-confirm", this.handleConfirmedSelection.bind(this));
  }
  /**
   * Show the selector popup.
   */
  show(callback, searchOptions = {}) {
    this.callback = callback;
    this.getSelector().configureSearchOptions(searchOptions);
    this.getPopup().show();
    this.getSelector().focusSearch();
  }
  hide() {
    this.getPopup().hide();
  }
  getPopup() {
    return window.$components.firstOnElement(this.container, "popup");
  }
  getSelector() {
    return window.$components.firstOnElement(this.selectorEl, "entity-selector");
  }
  onSelectButtonClick() {
    this.handleConfirmedSelection(this.selection);
  }
  onSelectionChange(entity) {
    this.selection = entity.hasOwnProperty("id") ? entity : null;
    if (!this.selection) {
      this.selectButton.setAttribute("disabled", "true");
    } else {
      this.selectButton.removeAttribute("disabled");
    }
  }
  handleConfirmedSelection(entity) {
    this.hide();
    this.getSelector().reset();
    if (this.callback && entity) this.callback(entity);
  }
};

// resources/js/components/event-emit-select.js
var EventEmitSelect = class extends Component {
  setup() {
    this.container = this.$el;
    this.name = this.$opts.name;
    onSelect(this.$el, () => {
      this.$emit(this.name, this.$opts);
    });
  }
};

// resources/js/components/expand-toggle.js
var ExpandToggle = class extends Component {
  setup() {
    this.targetSelector = this.$opts.targetSelector;
    this.isOpen = this.$opts.isOpen === "true";
    this.updateEndpoint = this.$opts.updateEndpoint;
    this.$el.addEventListener("click", this.click.bind(this));
  }
  open(elemToToggle) {
    slideDown(elemToToggle, 200);
  }
  close(elemToToggle) {
    slideUp(elemToToggle, 200);
  }
  click(event) {
    event.preventDefault();
    const matchingElems = document.querySelectorAll(this.targetSelector);
    for (const match of matchingElems) {
      const action = this.isOpen ? this.close : this.open;
      action(match);
    }
    this.isOpen = !this.isOpen;
    this.updateSystemAjax(this.isOpen);
  }
  updateSystemAjax(isOpen) {
    window.$http.patch(this.updateEndpoint, {
      expand: isOpen ? "true" : "false"
    });
  }
};

// resources/js/components/global-search.js
var GlobalSearch = class extends Component {
  setup() {
    this.container = this.$el;
    this.input = this.$refs.input;
    this.suggestions = this.$refs.suggestions;
    this.suggestionResultsWrap = this.$refs.suggestionResults;
    this.loadingWrap = this.$refs.loading;
    this.button = this.$refs.button;
    this.setupListeners();
  }
  setupListeners() {
    const updateSuggestionsDebounced = debounce(this.updateSuggestions.bind(this), 200, false);
    this.input.addEventListener("input", () => {
      const { value } = this.input;
      if (value.length > 0) {
        this.loadingWrap.style.display = "block";
        this.suggestionResultsWrap.style.opacity = "0.5";
        updateSuggestionsDebounced(value);
      } else {
        this.hideSuggestions();
      }
    });
    this.input.addEventListener("dblclick", () => {
      this.input.setAttribute("autocomplete", "on");
      this.button.focus();
      this.input.focus();
    });
    new KeyboardNavigationHandler(this.container, () => {
      this.hideSuggestions();
    });
  }
  /**
   * @param {String} search
   */
  async updateSuggestions(search) {
    const { data: results } = await window.$http.get("/search/suggest", { term: search });
    if (!this.input.value) {
      return;
    }
    const resultDom = htmlToDom(results);
    this.suggestionResultsWrap.innerHTML = "";
    this.suggestionResultsWrap.style.opacity = "1";
    this.loadingWrap.style.display = "none";
    this.suggestionResultsWrap.append(resultDom);
    if (!this.container.classList.contains("search-active")) {
      this.showSuggestions();
    }
  }
  showSuggestions() {
    this.container.classList.add("search-active");
    window.requestAnimationFrame(() => {
      this.suggestions.classList.add("search-suggestions-animation");
    });
  }
  hideSuggestions() {
    this.container.classList.remove("search-active");
    this.suggestions.classList.remove("search-suggestions-animation");
    this.suggestionResultsWrap.innerHTML = "";
  }
};

// resources/js/components/header-mobile-toggle.js
var HeaderMobileToggle = class extends Component {
  setup() {
    this.elem = this.$el;
    this.toggleButton = this.$refs.toggle;
    this.menu = this.$refs.menu;
    this.open = false;
    this.toggleButton.addEventListener("click", this.onToggle.bind(this));
    this.onWindowClick = this.onWindowClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  onToggle(event) {
    this.open = !this.open;
    this.menu.classList.toggle("show", this.open);
    this.toggleButton.setAttribute("aria-expanded", this.open ? "true" : "false");
    if (this.open) {
      this.elem.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("click", this.onWindowClick);
    } else {
      this.elem.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("click", this.onWindowClick);
    }
    event.stopPropagation();
  }
  onKeyDown(event) {
    if (event.code === "Escape") {
      this.onToggle(event);
    }
  }
  onWindowClick(event) {
    this.onToggle(event);
  }
};

// resources/js/components/image-manager.js
var ImageManager = class extends Component {
  setup() {
    this.uploadedTo = this.$opts.uploadedTo;
    this.container = this.$el;
    this.popupEl = this.$refs.popup;
    this.searchForm = this.$refs.searchForm;
    this.searchInput = this.$refs.searchInput;
    this.cancelSearch = this.$refs.cancelSearch;
    this.listContainer = this.$refs.listContainer;
    this.filterTabs = this.$manyRefs.filterTabs;
    this.selectButton = this.$refs.selectButton;
    this.uploadButton = this.$refs.uploadButton;
    this.uploadHint = this.$refs.uploadHint;
    this.formContainer = this.$refs.formContainer;
    this.formContainerPlaceholder = this.$refs.formContainerPlaceholder;
    this.dropzoneContainer = this.$refs.dropzoneContainer;
    this.loadMore = this.$refs.loadMore;
    this.type = "gallery";
    this.lastSelected = {};
    this.lastSelectedTime = 0;
    this.callback = null;
    this.resetState = () => {
      this.hasData = false;
      this.page = 1;
      this.filter = "all";
    };
    this.resetState();
    this.setupListeners();
  }
  setupListeners() {
    onSelect(this.filterTabs, (e) => {
      this.resetAll();
      this.filter = e.target.dataset.filter;
      this.setActiveFilterTab(this.filter);
      this.loadGallery();
    });
    this.searchForm.addEventListener("submit", (event) => {
      this.resetListView();
      this.loadGallery();
      this.cancelSearch.toggleAttribute("hidden", !this.searchInput.value);
      event.preventDefault();
    });
    onSelect(this.cancelSearch, () => {
      this.resetListView();
      this.resetSearchView();
      this.loadGallery();
    });
    onChildEvent(this.container, ".load-more button", "click", this.runLoadMore.bind(this));
    this.listContainer.addEventListener("event-emit-select-image", this.onImageSelectEvent.bind(this));
    this.listContainer.addEventListener("error", (event) => {
      event.target.src = window.baseUrl("loading_error.png");
    }, true);
    onSelect(this.selectButton, () => {
      if (this.callback) {
        this.callback(this.lastSelected);
      }
      this.hide();
    });
    onChildEvent(this.formContainer, "#image-manager-delete", "click", () => {
      if (this.lastSelected) {
        this.loadImageEditForm(this.lastSelected.id, true);
      }
    });
    onChildEvent(this.formContainer, "#image-manager-rebuild-thumbs", "click", async (_, button) => {
      button.disabled = true;
      if (this.lastSelected) {
        await this.rebuildThumbnails(this.lastSelected.id);
      }
      button.disabled = false;
    });
    this.formContainer.addEventListener("ajax-form-success", () => {
      this.refreshGallery();
      this.resetEditForm();
    });
    this.container.addEventListener("dropzone-upload-success", this.refreshGallery.bind(this));
    const scrollZone = this.listContainer.parentElement;
    let scrollEvents = [];
    scrollZone.addEventListener("wheel", (event) => {
      const scrollOffset = Math.ceil(scrollZone.scrollHeight - scrollZone.scrollTop);
      const bottomedOut = scrollOffset === scrollZone.clientHeight;
      if (!bottomedOut || event.deltaY < 1) {
        return;
      }
      const secondAgo = Date.now() - 1e3;
      scrollEvents.push(Date.now());
      scrollEvents = scrollEvents.filter((d) => d >= secondAgo);
      if (scrollEvents.length > 5 && this.canLoadMore()) {
        this.runLoadMore();
      }
    });
  }
  /**
   * @param {({ thumbs: { display: string; }; url: string; name: string; }) => void} callback
   * @param {String} type
   */
  show(callback, type = "gallery") {
    this.resetAll();
    this.callback = callback;
    this.type = type;
    this.getPopup().show();
    const hideUploads = type !== "gallery";
    this.dropzoneContainer.classList.toggle("hidden", hideUploads);
    this.uploadButton.classList.toggle("hidden", hideUploads);
    this.uploadHint.classList.toggle("hidden", hideUploads);
    const dropzone = window.$components.firstOnElement(this.container, "dropzone");
    dropzone.toggleActive(!hideUploads);
    if (!this.hasData) {
      this.loadGallery();
      this.hasData = true;
    }
  }
  hide() {
    this.getPopup().hide();
  }
  /**
   * @returns {Popup}
   */
  getPopup() {
    return window.$components.firstOnElement(this.popupEl, "popup");
  }
  async loadGallery() {
    const params = {
      page: this.page,
      search: this.searchInput.value || null,
      uploaded_to: this.uploadedTo,
      filter_type: this.filter === "all" ? null : this.filter
    };
    const { data: html } = await window.$http.get(`images/${this.type}`, params);
    if (params.page === 1) {
      this.listContainer.innerHTML = "";
    }
    this.addReturnedHtmlElementsToList(html);
    removeLoading(this.listContainer);
  }
  addReturnedHtmlElementsToList(html) {
    const el2 = document.createElement("div");
    el2.innerHTML = html;
    const loadMore = el2.querySelector(".load-more");
    if (loadMore) {
      loadMore.remove();
      this.loadMore.innerHTML = loadMore.innerHTML;
    }
    this.loadMore.toggleAttribute("hidden", !loadMore);
    window.$components.init(el2);
    for (const child of [...el2.children]) {
      this.listContainer.appendChild(child);
    }
  }
  setActiveFilterTab(filterName) {
    for (const tab of this.filterTabs) {
      const selected = tab.dataset.filter === filterName;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    }
  }
  resetAll() {
    this.resetState();
    this.resetListView();
    this.resetSearchView();
    this.resetEditForm();
    this.setActiveFilterTab("all");
    this.selectButton.classList.add("hidden");
  }
  resetSearchView() {
    this.searchInput.value = "";
    this.cancelSearch.toggleAttribute("hidden", true);
  }
  resetEditForm() {
    this.formContainer.innerHTML = "";
    this.formContainerPlaceholder.removeAttribute("hidden");
  }
  resetListView() {
    showLoading(this.listContainer);
    this.page = 1;
  }
  refreshGallery() {
    this.resetListView();
    this.loadGallery();
  }
  async onImageSelectEvent(event) {
    let image = JSON.parse(event.detail.data);
    const isDblClick = image && image.id === this.lastSelected.id && Date.now() - this.lastSelectedTime < 400;
    const alreadySelected = event.target.classList.contains("selected");
    [...this.listContainer.querySelectorAll(".selected")].forEach((el2) => {
      el2.classList.remove("selected");
    });
    if (!alreadySelected && !isDblClick) {
      event.target.classList.add("selected");
      image = await this.loadImageEditForm(image.id);
    } else if (!isDblClick) {
      this.resetEditForm();
    } else if (isDblClick) {
      image = this.lastSelected;
    }
    this.selectButton.classList.toggle("hidden", alreadySelected);
    if (isDblClick && this.callback) {
      this.callback(image);
      this.hide();
    }
    this.lastSelected = image;
    this.lastSelectedTime = Date.now();
  }
  async loadImageEditForm(imageId, requestDelete = false) {
    if (!requestDelete) {
      this.formContainer.innerHTML = "";
    }
    const params = requestDelete ? { delete: true } : {};
    const { data: formHtml } = await window.$http.get(`/images/edit/${imageId}`, params);
    this.formContainer.innerHTML = formHtml;
    this.formContainerPlaceholder.setAttribute("hidden", "");
    window.$components.init(this.formContainer);
    const imageDataEl = this.formContainer.querySelector("#image-manager-form-image-data");
    return JSON.parse(imageDataEl.text);
  }
  runLoadMore() {
    showLoading(this.loadMore);
    this.page += 1;
    this.loadGallery();
  }
  canLoadMore() {
    return this.loadMore.querySelector("button") && !this.loadMore.hasAttribute("hidden");
  }
  async rebuildThumbnails(imageId) {
    try {
      const response = await window.$http.put(`/images/${imageId}/rebuild-thumbnails`);
      window.$events.success(response.data);
      this.refreshGallery();
    } catch (err) {
      window.$events.showResponseError(err);
    }
  }
};

// resources/js/components/image-picker.js
var ImagePicker = class extends Component {
  setup() {
    this.imageElem = this.$refs.image;
    this.imageInput = this.$refs.imageInput;
    this.resetInput = this.$refs.resetInput;
    this.removeInput = this.$refs.removeInput;
    this.resetButton = this.$refs.resetButton;
    this.removeButton = this.$refs.removeButton || null;
    this.defaultImage = this.$opts.defaultImage;
    this.setupListeners();
  }
  setupListeners() {
    this.resetButton.addEventListener("click", this.reset.bind(this));
    if (this.removeButton) {
      this.removeButton.addEventListener("click", this.removeImage.bind(this));
    }
    this.imageInput.addEventListener("change", this.fileInputChange.bind(this));
  }
  fileInputChange() {
    this.resetInput.setAttribute("disabled", "disabled");
    if (this.removeInput) {
      this.removeInput.setAttribute("disabled", "disabled");
    }
    for (const file of this.imageInput.files) {
      this.imageElem.src = window.URL.createObjectURL(file);
    }
    this.imageElem.classList.remove("none");
  }
  reset() {
    this.imageInput.value = "";
    this.imageElem.src = this.defaultImage;
    this.resetInput.removeAttribute("disabled");
    if (this.removeInput) {
      this.removeInput.setAttribute("disabled", "disabled");
    }
    this.imageElem.classList.remove("none");
  }
  removeImage() {
    this.imageInput.value = "";
    this.imageElem.classList.add("none");
    this.removeInput.removeAttribute("disabled");
    this.resetInput.setAttribute("disabled", "disabled");
  }
};

// resources/js/components/list-sort-control.js
var ListSortControl = class extends Component {
  setup() {
    this.elem = this.$el;
    this.menu = this.$refs.menu;
    this.sortInput = this.$refs.sort;
    this.orderInput = this.$refs.order;
    this.form = this.$refs.form;
    this.setupListeners();
  }
  setupListeners() {
    this.menu.addEventListener("click", (event) => {
      if (event.target.closest("[data-sort-value]") !== null) {
        this.sortOptionClick(event);
      }
    });
    this.elem.addEventListener("click", (event) => {
      if (event.target.closest("[data-sort-dir]") !== null) {
        this.sortDirectionClick(event);
      }
    });
  }
  sortOptionClick(event) {
    const sortOption = event.target.closest("[data-sort-value]");
    this.sortInput.value = sortOption.getAttribute("data-sort-value");
    event.preventDefault();
    this.form.submit();
  }
  sortDirectionClick(event) {
    const currentDir = this.orderInput.value;
    this.orderInput.value = currentDir === "asc" ? "desc" : "asc";
    event.preventDefault();
    this.form.submit();
  }
};

// resources/js/wysiwyg/utils/dom.ts
function el(tag, attrs = {}, children = []) {
  const el2 = document.createElement(tag);
  const attrKeys = Object.keys(attrs);
  for (const attr of attrKeys) {
    if (attrs[attr] !== null) {
      el2.setAttribute(attr, attrs[attr]);
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      el2.append(document.createTextNode(child));
    } else {
      el2.append(child);
    }
  }
  return el2;
}

// resources/js/components/loading-button.ts
var LoadingButton = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "button");
    __publicField(this, "loadingEl", null);
  }
  setup() {
    this.button = this.$el;
    const form = this.button.form;
    const action = () => {
      setTimeout(() => this.showLoadingState(), 10);
    };
    this.button.addEventListener("click", action);
    if (form) {
      form.addEventListener("submit", action);
    }
  }
  showLoadingState() {
    this.button.disabled = true;
    if (!this.loadingEl) {
      this.loadingEl = el("div", { class: "inline block" });
      showLoading(this.loadingEl);
      this.button.after(this.loadingEl);
    }
  }
};

// resources/js/components/markdown-editor.js
var MarkdownEditor = class extends Component {
  setup() {
    this.elem = this.$el;
    this.pageId = this.$opts.pageId;
    this.textDirection = this.$opts.textDirection;
    this.imageUploadErrorText = this.$opts.imageUploadErrorText;
    this.serverUploadLimitText = this.$opts.serverUploadLimitText;
    this.display = this.$refs.display;
    this.input = this.$refs.input;
    this.divider = this.$refs.divider;
    this.displayWrap = this.$refs.displayWrap;
    const { settingContainer } = this.$refs;
    const settingInputs = settingContainer.querySelectorAll('input[type="checkbox"]');
    this.editor = null;
    window.importVersioned("markdown").then((markdown) => {
      return markdown.init({
        pageId: this.pageId,
        container: this.elem,
        displayEl: this.display,
        inputEl: this.input,
        drawioUrl: this.getDrawioUrl(),
        settingInputs: Array.from(settingInputs),
        text: {
          serverUploadLimit: this.serverUploadLimitText,
          imageUploadError: this.imageUploadErrorText
        }
      });
    }).then((editor) => {
      this.editor = editor;
      this.setupListeners();
      this.emitEditorEvents();
      this.scrollToTextIfNeeded();
      this.editor.actions.updateAndRender();
    });
  }
  emitEditorEvents() {
    window.$events.emitPublic(this.elem, "editor-markdown::setup", {
      markdownIt: this.editor.markdown.getRenderer(),
      displayEl: this.display,
      cmEditorView: this.editor.cm
    });
  }
  setupListeners() {
    this.elem.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (button === null) return;
      const action = button.getAttribute("data-action");
      if (action === "insertImage") this.editor.actions.showImageInsert();
      if (action === "insertLink") this.editor.actions.showLinkSelector();
      if (action === "insertDrawing" && (event.ctrlKey || event.metaKey)) {
        this.editor.actions.showImageManager();
        return;
      }
      if (action === "insertDrawing") this.editor.actions.startDrawing();
      if (action === "fullscreen") this.editor.actions.fullScreen();
    });
    this.elem.addEventListener("click", (event) => {
      const toolbarLabel = event.target.closest(".editor-toolbar-label");
      if (!toolbarLabel) return;
      const currentActiveSections = this.elem.querySelectorAll(".markdown-editor-wrap");
      for (const activeElem of currentActiveSections) {
        activeElem.classList.remove("active");
      }
      toolbarLabel.closest(".markdown-editor-wrap").classList.add("active");
    });
    this.handleDividerDrag();
  }
  handleDividerDrag() {
    this.divider.addEventListener("pointerdown", () => {
      const wrapRect = this.elem.getBoundingClientRect();
      const moveListener = (event) => {
        const xRel = event.pageX - wrapRect.left;
        const xPct = Math.min(Math.max(20, Math.floor(xRel / wrapRect.width * 100)), 80);
        this.displayWrap.style.flexBasis = `${100 - xPct}%`;
        this.editor.settings.set("editorWidth", xPct);
      };
      const upListener = () => {
        window.removeEventListener("pointermove", moveListener);
        window.removeEventListener("pointerup", upListener);
        this.display.style.pointerEvents = null;
        document.body.style.userSelect = null;
      };
      this.display.style.pointerEvents = "none";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", moveListener);
      window.addEventListener("pointerup", upListener);
    });
    const widthSetting = this.editor.settings.get("editorWidth");
    if (widthSetting) {
      this.displayWrap.style.flexBasis = `${100 - widthSetting}%`;
    }
  }
  scrollToTextIfNeeded() {
    const queryParams = new URL(window.location).searchParams;
    const scrollText = queryParams.get("content-text");
    if (scrollText) {
      this.editor.actions.scrollToText(scrollText);
    }
  }
  /**
   * Get the URL for the configured drawio instance.
   * @returns {String}
   */
  getDrawioUrl() {
    const drawioAttrEl = document.querySelector("[drawio-url]");
    if (!drawioAttrEl) {
      return "";
    }
    return drawioAttrEl.getAttribute("drawio-url") || "";
  }
  /**
   * Get the content of this editor.
   * Used by the parent page editor component.
   * @return {Promise<{html: String, markdown: String}>}
   */
  async getContent() {
    return this.editor.actions.getContent();
  }
};

// resources/js/components/new-user-password.js
var NewUserPassword = class extends Component {
  setup() {
    this.container = this.$el;
    this.inputContainer = this.$refs.inputContainer;
    this.inviteOption = this.container.querySelector("input[name=send_invite]");
    if (this.inviteOption) {
      this.inviteOption.addEventListener("change", this.inviteOptionChange.bind(this));
      this.inviteOptionChange();
    }
  }
  inviteOptionChange() {
    const inviting = this.inviteOption.value === "true";
    const passwordBoxes = this.container.querySelectorAll("input[type=password]");
    for (const input of passwordBoxes) {
      input.disabled = inviting;
    }
    this.inputContainer.style.display = inviting ? "none" : "block";
  }
};

// resources/js/components/notification.js
var Notification = class extends Component {
  setup() {
    this.container = this.$el;
    this.type = this.$opts.type;
    this.textElem = this.container.querySelector("span");
    this.autoHide = this.$opts.autoHide === "true";
    this.initialShow = this.$opts.show === "true";
    this.container.style.display = "grid";
    window.$events.listen(this.type, (text) => {
      this.show(text);
    });
    this.container.addEventListener("click", this.hide.bind(this));
    if (this.initialShow) {
      setTimeout(() => this.show(this.textElem.textContent), 100);
    }
    this.hideCleanup = this.hideCleanup.bind(this);
  }
  show(textToShow = "") {
    this.container.removeEventListener("transitionend", this.hideCleanup);
    this.textElem.textContent = textToShow;
    this.container.style.display = "grid";
    setTimeout(() => {
      this.container.classList.add("showing");
    }, 1);
    if (this.autoHide) {
      const words = textToShow.split(" ").length;
      const timeToShow = Math.max(2e3, 1e3 + 250 * words);
      setTimeout(this.hide.bind(this), timeToShow);
    }
  }
  hide() {
    this.container.classList.remove("showing");
    this.container.addEventListener("transitionend", this.hideCleanup);
  }
  hideCleanup() {
    this.container.style.display = "none";
    this.container.removeEventListener("transitionend", this.hideCleanup);
  }
};

// resources/js/components/optional-input.js
var OptionalInput = class extends Component {
  setup() {
    this.removeButton = this.$refs.remove;
    this.showButton = this.$refs.show;
    this.input = this.$refs.input;
    this.setupListeners();
  }
  setupListeners() {
    onSelect(this.removeButton, () => {
      this.input.value = "";
      this.input.classList.add("hidden");
      this.removeButton.classList.add("hidden");
      this.showButton.classList.remove("hidden");
    });
    onSelect(this.showButton, () => {
      this.input.classList.remove("hidden");
      this.removeButton.classList.remove("hidden");
      this.showButton.classList.add("hidden");
    });
  }
};

// resources/js/components/page-comment.ts
var PageComment = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "commentId");
    __publicField(this, "commentLocalId");
    __publicField(this, "deletedText");
    __publicField(this, "updatedText");
    __publicField(this, "archiveText");
    __publicField(this, "wysiwygEditor", null);
    __publicField(this, "wysiwygTextDirection");
    __publicField(this, "container");
    __publicField(this, "contentContainer");
    __publicField(this, "form");
    __publicField(this, "formCancel");
    __publicField(this, "editButton");
    __publicField(this, "deleteButton");
    __publicField(this, "replyButton");
    __publicField(this, "archiveButton");
    __publicField(this, "input");
  }
  setup() {
    this.commentId = this.$opts.commentId;
    this.commentLocalId = this.$opts.commentLocalId;
    this.deletedText = this.$opts.deletedText;
    this.updatedText = this.$opts.updatedText;
    this.archiveText = this.$opts.archiveText;
    this.wysiwygTextDirection = this.$opts.wysiwygTextDirection;
    this.container = this.$el;
    this.contentContainer = this.$refs.contentContainer;
    this.form = this.$refs.form;
    this.formCancel = this.$refs.formCancel;
    this.editButton = this.$refs.editButton;
    this.deleteButton = this.$refs.deleteButton;
    this.replyButton = this.$refs.replyButton;
    this.archiveButton = this.$refs.archiveButton;
    this.input = this.$refs.input;
    this.setupListeners();
  }
  setupListeners() {
    if (this.replyButton) {
      const data = {
        id: this.commentLocalId,
        element: this.container
      };
      this.replyButton.addEventListener("click", () => this.$emit("reply", data));
    }
    if (this.editButton) {
      this.editButton.addEventListener("click", this.startEdit.bind(this));
      this.form.addEventListener("submit", this.update.bind(this));
      this.formCancel.addEventListener("click", () => this.toggleEditMode(false));
    }
    if (this.deleteButton) {
      this.deleteButton.addEventListener("click", this.delete.bind(this));
    }
    if (this.archiveButton) {
      this.archiveButton.addEventListener("click", this.archive.bind(this));
    }
  }
  toggleEditMode(show2) {
    this.contentContainer.toggleAttribute("hidden", show2);
    this.form.toggleAttribute("hidden", !show2);
  }
  async startEdit() {
    this.toggleEditMode(true);
    if (this.wysiwygEditor) {
      this.wysiwygEditor.focus();
      return;
    }
    const wysiwygModule = await window.importVersioned("wysiwyg");
    const editorContent = this.input.value;
    const container = el("div", { class: "comment-editor-container" });
    this.input.parentElement?.appendChild(container);
    this.input.hidden = true;
    this.wysiwygEditor = wysiwygModule.createBasicEditorInstance(container, editorContent, {
      darkMode: document.documentElement.classList.contains("dark-mode"),
      textDirection: this.$opts.textDirection,
      translations: window.editor_translations
    });
    this.wysiwygEditor.focus();
  }
  async update(event) {
    event.preventDefault();
    const loading = this.showLoading();
    this.form.toggleAttribute("hidden", true);
    const reqData = {
      html: await this.wysiwygEditor?.getContentAsHtml() || ""
    };
    try {
      const resp = await window.$http.put(`/comment/${this.commentId}`, reqData);
      const newComment = htmlToDom(resp.data);
      this.container.replaceWith(newComment);
      window.$events.success(this.updatedText);
    } catch (err) {
      console.error(err);
      if (err instanceof HttpError) {
        window.$events.showValidationErrors(err);
      }
      this.form.toggleAttribute("hidden", false);
      loading.remove();
    }
  }
  async delete() {
    this.showLoading();
    await window.$http.delete(`/comment/${this.commentId}`);
    this.$emit("delete");
    const branch = this.container.closest(".comment-branch");
    if (branch instanceof HTMLElement) {
      const refs = window.$components.allWithinElement(branch, "page-comment-reference");
      for (const ref of refs) {
        ref.hideMarker();
      }
      branch.remove();
    }
    window.$events.success(this.deletedText);
  }
  async archive() {
    this.showLoading();
    const isArchived = this.archiveButton.dataset.isArchived === "true";
    const action = isArchived ? "unarchive" : "archive";
    const response = await window.$http.put(`/comment/${this.commentId}/${action}`);
    window.$events.success(this.archiveText);
    const eventData = { new_thread_dom: htmlToDom(response.data) };
    this.$emit(action, eventData);
    const branch = this.container.closest(".comment-branch");
    const references = window.$components.allWithinElement(branch, "page-comment-reference");
    for (const reference of references) {
      reference.hideMarker();
    }
    branch.remove();
  }
  showLoading() {
    const loading = getLoading();
    loading.classList.add("px-l");
    this.container.append(loading);
    return loading;
  }
};

// resources/icons/comment.svg
var comment_default = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4zM18 14H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z"/><path fill="none" d="M0 0h24v24H0z"/></svg>';

// resources/icons/close.svg
var close_default = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

// resources/js/components/page-comment-reference.ts
var openMarkerClose = null;
var PageCommentReference = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "link");
    __publicField(this, "reference");
    __publicField(this, "markerWrap", null);
    __publicField(this, "viewCommentText");
    __publicField(this, "jumpToThreadText");
    __publicField(this, "closeText");
  }
  setup() {
    this.link = this.$el;
    this.reference = this.$opts.reference;
    this.viewCommentText = this.$opts.viewCommentText;
    this.jumpToThreadText = this.$opts.jumpToThreadText;
    this.closeText = this.$opts.closeText;
    this.showForDisplay();
    window.addEventListener("editor-toolbox-change", (event) => {
      const tabName = event.detail.tab;
      const isOpen = event.detail.open;
      if (tabName === "comments" && isOpen && this.link.checkVisibility()) {
        this.showForEditor();
      } else {
        this.hideMarker();
      }
    });
    window.addEventListener("toggle", (event) => {
      if (event.target instanceof HTMLElement && event.target.contains(this.link)) {
        window.requestAnimationFrame(() => {
          if (this.link.checkVisibility()) {
            this.showForEditor();
          } else {
            this.hideMarker();
          }
        });
      }
    }, { capture: true });
    window.addEventListener("tabs-change", (event) => {
      const sectionId = event.detail.showing;
      if (!sectionId.startsWith("comment-tab-panel")) {
        return;
      }
      const panel = document.getElementById(sectionId);
      if (panel?.contains(this.link)) {
        this.showForDisplay();
      } else {
        this.hideMarker();
      }
    });
  }
  showForDisplay() {
    const pageContentArea = document.querySelector(".page-content");
    if (pageContentArea instanceof HTMLElement && this.link.checkVisibility()) {
      this.updateMarker(pageContentArea);
    }
  }
  showForEditor() {
    const contentWrap = document.querySelector(".editor-content-wrap");
    if (contentWrap instanceof HTMLElement) {
      this.updateMarker(contentWrap);
    }
    const onChange = () => {
      this.hideMarker();
      setTimeout(() => {
        window.$events.remove("editor-html-change", onChange);
      }, 1);
    };
    window.$events.listen("editor-html-change", onChange);
  }
  updateMarker(contentContainer) {
    this.link.classList.remove("outdated", "missing");
    if (this.markerWrap) {
      this.markerWrap.remove();
    }
    const [refId, refHash, refRange] = this.reference.split(":");
    const refEl = document.getElementById(refId);
    if (!refEl) {
      this.link.classList.add("outdated", "missing");
      return;
    }
    const actualHash = hashElement(refEl);
    if (actualHash !== refHash) {
      this.link.classList.add("outdated");
    }
    const marker = el("button", {
      type: "button",
      class: "content-comment-marker",
      title: this.viewCommentText
    });
    marker.innerHTML = comment_default;
    marker.addEventListener("click", (event) => {
      this.showCommentAtMarker(marker);
    });
    this.markerWrap = el("div", {
      class: "content-comment-highlight"
    }, [marker]);
    contentContainer.append(this.markerWrap);
    this.positionMarker(refEl, refRange);
    this.link.href = `#${refEl.id}`;
    this.link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollAndHighlightElement(refEl);
    });
    const debouncedReposition = debounce(() => {
      this.positionMarker(refEl, refRange);
    }, 50, false).bind(this);
    window.addEventListener("resize", debouncedReposition);
  }
  positionMarker(targetEl, range) {
    if (!this.markerWrap) {
      return;
    }
    const markerParent = this.markerWrap.parentElement;
    const parentBounds = markerParent.getBoundingClientRect();
    let targetBounds = targetEl.getBoundingClientRect();
    const [rangeStart, rangeEnd] = range.split("-");
    if (rangeStart && rangeEnd) {
      const range2 = new Range();
      const relStart = findTargetNodeAndOffset(targetEl, Number(rangeStart));
      const relEnd = findTargetNodeAndOffset(targetEl, Number(rangeEnd));
      if (relStart && relEnd) {
        range2.setStart(relStart.node, relStart.offset);
        range2.setEnd(relEnd.node, relEnd.offset);
        targetBounds = range2.getBoundingClientRect();
      }
    }
    const relLeft = targetBounds.left - parentBounds.left;
    const relTop = targetBounds.top - parentBounds.top + markerParent.scrollTop;
    this.markerWrap.style.left = `${relLeft}px`;
    this.markerWrap.style.top = `${relTop}px`;
    this.markerWrap.style.width = `${targetBounds.width}px`;
    this.markerWrap.style.height = `${targetBounds.height}px`;
  }
  hideMarker() {
    if (openMarkerClose) {
      openMarkerClose();
    }
    this.markerWrap?.remove();
    this.markerWrap = null;
  }
  showCommentAtMarker(marker) {
    if (openMarkerClose) {
      openMarkerClose();
    }
    marker.hidden = true;
    const commentBox = this.link.closest(".comment-box");
    const readClone = commentBox.closest(".comment-branch").cloneNode(true);
    const toRemove = readClone.querySelectorAll(".actions, form");
    for (const el2 of toRemove) {
      el2.remove();
    }
    const close2 = el("button", { type: "button", title: this.closeText });
    close2.innerHTML = close_default;
    const jump = el("button", { type: "button", "data-action": "jump" }, [this.jumpToThreadText]);
    const commentWindow = el("div", {
      class: "content-comment-window"
    }, [
      el("div", {
        class: "content-comment-window-actions"
      }, [jump, close2]),
      el("div", {
        class: "content-comment-window-content comment-container-compact comment-container-super-compact"
      }, [readClone])
    ]);
    marker.parentElement?.append(commentWindow);
    const closeAction = () => {
      commentWindow.remove();
      marker.hidden = false;
      window.removeEventListener("click", windowCloseAction);
      openMarkerClose = null;
    };
    const windowCloseAction = (event) => {
      if (!marker.parentElement.contains(event.target)) {
        closeAction();
      }
    };
    window.addEventListener("click", windowCloseAction);
    openMarkerClose = closeAction;
    close2.addEventListener("click", closeAction.bind(this));
    jump.addEventListener("click", () => {
      closeAction();
      commentBox.scrollIntoView({ behavior: "smooth" });
      const highlightTarget = commentBox.querySelector(".header");
      highlightTarget.classList.add("anim-highlight");
      highlightTarget.addEventListener("animationend", () => highlightTarget.classList.remove("anim-highlight"));
    });
    const commentWindowBounds = commentWindow.getBoundingClientRect();
    const contentBounds = document.querySelector(".page-content")?.getBoundingClientRect();
    if (contentBounds && commentWindowBounds.right > contentBounds.right) {
      const diff = commentWindowBounds.right - contentBounds.right;
      commentWindow.style.left = `-${diff}px`;
    }
  }
};

// resources/js/components/tabs.ts
var Tabs = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "container");
    __publicField(this, "tabList");
    __publicField(this, "tabs");
    __publicField(this, "panels");
    __publicField(this, "activeUnder");
    __publicField(this, "active", null);
  }
  setup() {
    this.container = this.$el;
    this.tabList = this.container.querySelector('[role="tablist"]');
    this.tabs = Array.from(this.tabList.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.container.querySelectorAll(':scope > [role="tabpanel"], :scope > * > [role="tabpanel"]'));
    this.activeUnder = this.$opts.activeUnder ? Number(this.$opts.activeUnder) : 1e4;
    this.container.addEventListener("click", (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab instanceof HTMLElement && this.tabs.includes(tab)) {
        this.show(tab.getAttribute("aria-controls") || "");
      }
    });
    window.addEventListener("resize", this.updateActiveState.bind(this), {
      passive: true
    });
    this.updateActiveState();
  }
  show(sectionId) {
    for (const panel of this.panels) {
      panel.toggleAttribute("hidden", panel.id !== sectionId);
    }
    for (const tab of this.tabs) {
      const tabSection = tab.getAttribute("aria-controls");
      const selected = tabSection === sectionId;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    }
    const data = { showing: sectionId };
    this.$emit("change", data);
  }
  updateActiveState() {
    const active = window.innerWidth < this.activeUnder;
    if (active === this.active) {
      return;
    }
    if (active) {
      this.activate();
    } else {
      this.deactivate();
    }
    this.active = active;
  }
  activate() {
    const panelToShow = this.panels.find((p) => !p.hasAttribute("hidden")) || this.panels[0];
    this.show(panelToShow.id);
    this.tabList.toggleAttribute("hidden", false);
  }
  deactivate() {
    for (const panel of this.panels) {
      panel.removeAttribute("hidden");
    }
    for (const tab of this.tabs) {
      tab.setAttribute("aria-selected", "false");
    }
    this.tabList.toggleAttribute("hidden", true);
  }
};

// resources/js/components/page-comments.ts
var PageComments = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "elem");
    __publicField(this, "pageId");
    __publicField(this, "container");
    __publicField(this, "commentCountBar");
    __publicField(this, "activeTab");
    __publicField(this, "archivedTab");
    __publicField(this, "addButtonContainer");
    __publicField(this, "archiveContainer");
    __publicField(this, "activeContainer");
    __publicField(this, "replyToRow");
    __publicField(this, "referenceRow");
    __publicField(this, "formContainer");
    __publicField(this, "form");
    __publicField(this, "formInput");
    __publicField(this, "formReplyLink");
    __publicField(this, "formReferenceLink");
    __publicField(this, "addCommentButton");
    __publicField(this, "hideFormButton");
    __publicField(this, "removeReplyToButton");
    __publicField(this, "removeReferenceButton");
    __publicField(this, "wysiwygTextDirection");
    __publicField(this, "wysiwygEditor", null);
    __publicField(this, "createdText");
    __publicField(this, "countText");
    __publicField(this, "archivedCountText");
    __publicField(this, "parentId", null);
    __publicField(this, "contentReference", "");
    __publicField(this, "formReplyText", "");
  }
  setup() {
    this.elem = this.$el;
    this.pageId = Number(this.$opts.pageId);
    this.container = this.$refs.commentContainer;
    this.commentCountBar = this.$refs.commentCountBar;
    this.activeTab = this.$refs.activeTab;
    this.archivedTab = this.$refs.archivedTab;
    this.addButtonContainer = this.$refs.addButtonContainer;
    this.archiveContainer = this.$refs.archiveContainer;
    this.activeContainer = this.$refs.activeContainer;
    this.replyToRow = this.$refs.replyToRow;
    this.referenceRow = this.$refs.referenceRow;
    this.formContainer = this.$refs.formContainer;
    this.form = this.$refs.form;
    this.formInput = this.$refs.formInput;
    this.formReplyLink = this.$refs.formReplyLink;
    this.formReferenceLink = this.$refs.formReferenceLink;
    this.addCommentButton = this.$refs.addCommentButton;
    this.hideFormButton = this.$refs.hideFormButton;
    this.removeReplyToButton = this.$refs.removeReplyToButton;
    this.removeReferenceButton = this.$refs.removeReferenceButton;
    this.wysiwygTextDirection = this.$opts.wysiwygTextDirection;
    this.createdText = this.$opts.createdText;
    this.countText = this.$opts.countText;
    this.archivedCountText = this.$opts.archivedCountText;
    this.formReplyText = this.formReplyLink?.textContent || "";
    this.setupListeners();
  }
  setupListeners() {
    this.elem.addEventListener("page-comment-delete", () => {
      setTimeout(() => {
        this.updateCount();
        this.hideForm();
      }, 1);
    });
    this.elem.addEventListener("page-comment-reply", (event) => {
      this.setReply(event.detail.id, event.detail.element);
    });
    this.elem.addEventListener("page-comment-archive", (event) => {
      this.archiveContainer.append(event.detail.new_thread_dom);
      setTimeout(() => this.updateCount(), 1);
    });
    this.elem.addEventListener("page-comment-unarchive", (event) => {
      this.container.append(event.detail.new_thread_dom);
      setTimeout(() => this.updateCount(), 1);
    });
    if (this.form) {
      this.removeReplyToButton.addEventListener("click", this.removeReplyTo.bind(this));
      this.removeReferenceButton.addEventListener("click", () => this.setContentReference(""));
      this.hideFormButton.addEventListener("click", this.hideForm.bind(this));
      this.addCommentButton.addEventListener("click", this.showForm.bind(this));
      this.form.addEventListener("submit", this.saveComment.bind(this));
    }
  }
  async saveComment(event) {
    event.preventDefault();
    event.stopPropagation();
    const loading = getLoading();
    loading.classList.add("px-l");
    this.form.after(loading);
    this.form.toggleAttribute("hidden", true);
    const reqData = {
      html: await this.wysiwygEditor?.getContentAsHtml() || "",
      parent_id: this.parentId || null,
      content_ref: this.contentReference
    };
    window.$http.post(`/comment/${this.pageId}`, reqData).then((resp) => {
      const newElem = htmlToDom(resp.data);
      if (reqData.parent_id) {
        this.formContainer.after(newElem);
      } else {
        this.container.append(newElem);
      }
      const refs = window.$components.allWithinElement(newElem, "page-comment-reference");
      for (const ref of refs) {
        ref.showForDisplay();
      }
      window.$events.success(this.createdText);
      this.hideForm();
      this.updateCount();
    }).catch((err) => {
      this.form.toggleAttribute("hidden", false);
      window.$events.showValidationErrors(err);
    });
    this.form.toggleAttribute("hidden", false);
    loading.remove();
  }
  updateCount() {
    const activeCount = this.getActiveThreadCount();
    this.activeTab.textContent = window.$trans.choice(this.countText, activeCount);
    const archivedCount = this.getArchivedThreadCount();
    this.archivedTab.textContent = window.$trans.choice(this.archivedCountText, archivedCount);
  }
  resetForm() {
    this.removeEditor();
    this.formInput.value = "";
    this.parentId = null;
    this.replyToRow.toggleAttribute("hidden", true);
    this.container.append(this.formContainer);
    this.setContentReference("");
  }
  showForm() {
    this.removeEditor();
    this.formContainer.toggleAttribute("hidden", false);
    this.addButtonContainer.toggleAttribute("hidden", true);
    this.formContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    this.loadEditor();
    const tabs = window.$components.firstOnElement(this.elem, "tabs");
    if (tabs instanceof Tabs && this.formContainer.closest("#comment-tab-panel-active")) {
      tabs.show("comment-tab-panel-active");
    }
  }
  hideForm() {
    this.resetForm();
    this.formContainer.toggleAttribute("hidden", true);
    if (this.getActiveThreadCount() > 0) {
      this.activeContainer.append(this.addButtonContainer);
    } else {
      this.commentCountBar.append(this.addButtonContainer);
    }
    this.addButtonContainer.toggleAttribute("hidden", false);
  }
  async loadEditor() {
    if (this.wysiwygEditor) {
      this.wysiwygEditor.focus();
      return;
    }
    const wysiwygModule = await window.importVersioned("wysiwyg");
    const container = el("div", { class: "comment-editor-container" });
    this.formInput.parentElement?.appendChild(container);
    this.formInput.hidden = true;
    this.wysiwygEditor = wysiwygModule.createBasicEditorInstance(container, "<p></p>", {
      darkMode: document.documentElement.classList.contains("dark-mode"),
      textDirection: this.wysiwygTextDirection,
      translations: window.editor_translations
    });
    this.wysiwygEditor.focus();
  }
  removeEditor() {
    if (this.wysiwygEditor) {
      this.wysiwygEditor.remove();
      this.wysiwygEditor = null;
    }
  }
  getActiveThreadCount() {
    return this.container.querySelectorAll(":scope > .comment-branch:not([hidden])").length;
  }
  getArchivedThreadCount() {
    return this.archiveContainer.querySelectorAll(":scope > .comment-branch").length;
  }
  setReply(commentLocalId, commentElement) {
    const targetFormLocation = commentElement.closest(".comment-branch").querySelector(".comment-branch-children");
    targetFormLocation.append(this.formContainer);
    this.showForm();
    this.parentId = Number(commentLocalId);
    this.replyToRow.toggleAttribute("hidden", false);
    this.formReplyLink.textContent = this.formReplyText.replace("1234", String(this.parentId));
    this.formReplyLink.href = `#comment${this.parentId}`;
  }
  removeReplyTo() {
    this.parentId = null;
    this.replyToRow.toggleAttribute("hidden", true);
    this.container.append(this.formContainer);
    this.showForm();
  }
  startNewComment(contentReference) {
    this.resetForm();
    this.showForm();
    this.setContentReference(contentReference);
  }
  setContentReference(reference) {
    this.contentReference = reference;
    this.referenceRow.toggleAttribute("hidden", !Boolean(reference));
    const [id] = reference.split(":");
    this.formReferenceLink.href = `#${id}`;
    this.formReferenceLink.onclick = function(event) {
      event.preventDefault();
      const el2 = document.getElementById(id);
      if (el2) {
        scrollAndHighlightElement(el2);
      }
    };
  }
};

// resources/js/components/page-display.js
function toggleAnchorHighlighting(elementId, shouldHighlight) {
  forEach(`#page-navigation a[href="#${elementId}"]`, (anchor) => {
    anchor.closest("li").classList.toggle("current-heading", shouldHighlight);
  });
}
function headingVisibilityChange(entries) {
  for (const entry of entries) {
    const isVisible = entry.intersectionRatio === 1;
    toggleAnchorHighlighting(entry.target.id, isVisible);
  }
}
function addNavObserver(headings) {
  const intersectOpts = {
    rootMargin: "0px 0px 0px 0px",
    threshold: 1
  };
  const pageNavObserver = new IntersectionObserver(headingVisibilityChange, intersectOpts);
  for (const heading of headings) {
    pageNavObserver.observe(heading);
  }
}
var PageDisplay = class extends Component {
  setup() {
    this.container = this.$el;
    this.pageId = this.$opts.pageId;
    window.importVersioned("code").then((Code2) => Code2.highlight());
    this.setupNavHighlighting();
    if (window.location.hash) {
      const text = window.location.hash.replace(/%20/g, " ").substring(1);
      this.goToText(text);
    }
    const sidebarPageNav = document.querySelector(".sidebar-page-nav");
    if (sidebarPageNav) {
      onChildEvent(sidebarPageNav, "a", "click", (event, child) => {
        event.preventDefault();
        window.$components.first("tri-layout").showContent();
        const contentId = child.getAttribute("href").substr(1);
        this.goToText(contentId);
        window.history.pushState(null, null, `#${contentId}`);
      });
    }
  }
  goToText(text) {
    const idElem = document.getElementById(text);
    forEach(".page-content [data-highlighted]", (elem2) => {
      elem2.removeAttribute("data-highlighted");
      elem2.style.backgroundColor = null;
    });
    if (idElem !== null) {
      scrollAndHighlightElement(idElem);
    } else {
      const textElem = findText(".page-content > div > *", text);
      if (textElem) {
        scrollAndHighlightElement(textElem);
      }
    }
  }
  setupNavHighlighting() {
    const pageNav = document.querySelector(".sidebar-page-nav");
    const headings = document.querySelector(".page-content").querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length > 0 && pageNav !== null) {
      addNavObserver(headings);
    }
  }
};

// resources/js/services/dates.ts
function utcTimeStampToLocalTime(timestamp) {
  const date = new Date(timestamp * 1e3);
  const hours = date.getHours();
  const mins = date.getMinutes();
  return `${(hours > 9 ? "" : "0") + hours}:${(mins > 9 ? "" : "0") + mins}`;
}

// resources/js/components/page-editor.js
var PageEditor = class extends Component {
  setup() {
    this.draftsEnabled = this.$opts.draftsEnabled === "true";
    this.editorType = this.$opts.editorType;
    this.pageId = Number(this.$opts.pageId);
    this.isNewDraft = this.$opts.pageNewDraft === "true";
    this.hasDefaultTitle = this.$opts.hasDefaultTitle || false;
    this.container = this.$el;
    this.titleElem = this.$refs.titleContainer.querySelector("input");
    this.saveDraftButton = this.$refs.saveDraft;
    this.discardDraftButton = this.$refs.discardDraft;
    this.discardDraftWrap = this.$refs.discardDraftWrap;
    this.deleteDraftButton = this.$refs.deleteDraft;
    this.deleteDraftWrap = this.$refs.deleteDraftWrap;
    this.draftDisplay = this.$refs.draftDisplay;
    this.draftDisplayIcon = this.$refs.draftDisplayIcon;
    this.changelogInput = this.$refs.changelogInput;
    this.changelogDisplay = this.$refs.changelogDisplay;
    this.changelogCounter = this.$refs.changelogCounter;
    this.changeEditorButtons = this.$manyRefs.changeEditor || [];
    this.switchDialogContainer = this.$refs.switchDialog;
    this.deleteDraftDialogContainer = this.$refs.deleteDraftDialog;
    this.draftText = this.$opts.draftText;
    this.autosaveFailText = this.$opts.autosaveFailText;
    this.editingPageText = this.$opts.editingPageText;
    this.draftDiscardedText = this.$opts.draftDiscardedText;
    this.draftDeleteText = this.$opts.draftDeleteText;
    this.draftDeleteFailText = this.$opts.draftDeleteFailText;
    this.setChangelogText = this.$opts.setChangelogText;
    this.autoSave = {
      interval: null,
      frequency: 3e4,
      last: 0,
      pendingChange: false
    };
    this.shownWarningsCache = /* @__PURE__ */ new Set();
    if (this.pageId !== 0 && this.draftsEnabled) {
      window.setTimeout(() => {
        this.startAutoSave();
      }, 1e3);
    }
    this.draftDisplay.innerHTML = this.draftText;
    this.setupListeners();
    this.setInitialFocus();
  }
  setupListeners() {
    window.$events.listen("editor-save-draft", this.saveDraft.bind(this));
    window.$events.listen("editor-save-page", this.savePage.bind(this));
    const onContentChange = () => {
      this.autoSave.pendingChange = true;
    };
    window.$events.listen("editor-html-change", onContentChange);
    window.$events.listen("editor-markdown-change", onContentChange);
    this.titleElem.addEventListener("input", onContentChange);
    const updateChangelogDebounced = debounce(this.updateChangelogDisplay.bind(this), 300, false);
    this.changelogInput.addEventListener("input", () => {
      const count = this.changelogInput.value.length;
      this.changelogCounter.innerText = `${count} / 180`;
      updateChangelogDebounced();
    });
    onSelect(this.saveDraftButton, this.saveDraft.bind(this));
    onSelect(this.discardDraftButton, this.discardDraft.bind(this));
    onSelect(this.deleteDraftButton, this.deleteDraft.bind(this));
    onSelect(this.changeEditorButtons, this.changeEditor.bind(this));
  }
  setInitialFocus() {
    if (this.hasDefaultTitle) {
      this.titleElem.select();
      return;
    }
    window.setTimeout(() => {
      window.$events.emit("editor::focus", "");
    }, 500);
  }
  startAutoSave() {
    this.autoSave.interval = window.setInterval(this.runAutoSave.bind(this), this.autoSave.frequency);
  }
  runAutoSave() {
    const savedRecently = Date.now() - this.autoSave.last < this.autoSave.frequency / 2;
    if (savedRecently || !this.autoSave.pendingChange) {
      return;
    }
    this.saveDraft();
  }
  savePage() {
    this.container.closest("form").requestSubmit();
  }
  async saveDraft() {
    const data = { name: this.titleElem.value.trim() };
    const editorContent = await this.getEditorComponent().getContent();
    Object.assign(data, editorContent);
    let didSave = false;
    try {
      const resp = await window.$http.put(`/ajax/page/${this.pageId}/save-draft`, data);
      if (!this.isNewDraft) {
        this.discardDraftWrap.toggleAttribute("hidden", false);
        this.deleteDraftWrap.toggleAttribute("hidden", false);
      }
      this.draftNotifyChange(`${resp.data.message} ${utcTimeStampToLocalTime(resp.data.timestamp)}`);
      this.autoSave.last = Date.now();
      if (resp.data.warning && !this.shownWarningsCache.has(resp.data.warning)) {
        window.$events.emit("warning", resp.data.warning);
        this.shownWarningsCache.add(resp.data.warning);
      }
      didSave = true;
      this.autoSave.pendingChange = false;
    } catch {
      try {
        const saveKey = `draft-save-fail-${(/* @__PURE__ */ new Date()).toISOString()}`;
        window.localStorage.setItem(saveKey, JSON.stringify(data));
      } catch (lsErr) {
        console.error(lsErr);
      }
      window.$events.emit("error", this.autosaveFailText);
    }
    return didSave;
  }
  draftNotifyChange(text) {
    this.draftDisplay.innerText = text;
    this.draftDisplayIcon.classList.add("visible");
    window.setTimeout(() => {
      this.draftDisplayIcon.classList.remove("visible");
    }, 2e3);
  }
  async discardDraft(notify = true) {
    let response;
    try {
      response = await window.$http.get(`/ajax/page/${this.pageId}`);
    } catch (e) {
      console.error(e);
      return;
    }
    if (this.autoSave.interval) {
      window.clearInterval(this.autoSave.interval);
    }
    this.draftDisplay.innerText = this.editingPageText;
    this.discardDraftWrap.toggleAttribute("hidden", true);
    window.$events.emit("editor::replace", {
      html: response.data.html,
      markdown: response.data.markdown
    });
    this.titleElem.value = response.data.name;
    window.setTimeout(() => {
      this.startAutoSave();
    }, 1e3);
    if (notify) {
      window.$events.success(this.draftDiscardedText);
    }
  }
  async deleteDraft() {
    const dialog = window.$components.firstOnElement(this.deleteDraftDialogContainer, "confirm-dialog");
    const confirmed = await dialog.show();
    if (!confirmed) {
      return;
    }
    try {
      const discard = this.discardDraft(false);
      const draftDelete = window.$http.delete(`/page-revisions/user-drafts/${this.pageId}`);
      await Promise.all([discard, draftDelete]);
      window.$events.success(this.draftDeleteText);
      this.deleteDraftWrap.toggleAttribute("hidden", true);
    } catch (err) {
      console.error(err);
      window.$events.error(this.draftDeleteFailText);
    }
  }
  updateChangelogDisplay() {
    let summary = this.changelogInput.value.trim();
    if (summary.length === 0) {
      summary = this.setChangelogText;
    } else if (summary.length > 16) {
      summary = `${summary.slice(0, 16)}...`;
    }
    this.changelogDisplay.innerText = summary;
  }
  async changeEditor(event) {
    event.preventDefault();
    const link = event.target.closest("a").href;
    const dialog = window.$components.firstOnElement(this.switchDialogContainer, "confirm-dialog");
    const [saved, confirmed] = await Promise.all([this.saveDraft(), dialog.show()]);
    if (saved && confirmed) {
      window.location = link;
    }
  }
  /**
   * @return {MarkdownEditor|WysiwygEditor|WysiwygEditorTinymce}
   */
  getEditorComponent() {
    return window.$components.first("markdown-editor") || window.$components.first("wysiwyg-editor") || window.$components.first("wysiwyg-editor-tinymce");
  }
};

// resources/js/components/page-picker.js
function toggleElem(elem2, show2) {
  elem2.toggleAttribute("hidden", !show2);
}
var PagePicker = class extends Component {
  setup() {
    this.input = this.$refs.input;
    this.resetButton = this.$refs.resetButton;
    this.selectButton = this.$refs.selectButton;
    this.display = this.$refs.display;
    this.defaultDisplay = this.$refs.defaultDisplay;
    this.buttonSep = this.$refs.buttonSeperator;
    this.selectorEndpoint = this.$opts.selectorEndpoint;
    this.value = this.input.value;
    this.setupListeners();
  }
  setupListeners() {
    this.selectButton.addEventListener("click", this.showPopup.bind(this));
    this.display.parentElement.addEventListener("click", this.showPopup.bind(this));
    this.display.addEventListener("click", (e) => e.stopPropagation());
    this.resetButton.addEventListener("click", () => {
      this.setValue("", "");
    });
  }
  showPopup() {
    const selectorPopup = window.$components.first("entity-selector-popup");
    selectorPopup.show((entity) => {
      this.setValue(entity.id, entity.name);
    }, {
      initialValue: "",
      searchEndpoint: this.selectorEndpoint,
      entityTypes: "page",
      entityPermission: "view"
    });
  }
  setValue(value, name) {
    this.value = value;
    this.input.value = value;
    this.controlView(name);
  }
  controlView(name) {
    const hasValue = this.value && this.value !== 0;
    toggleElem(this.resetButton, hasValue);
    toggleElem(this.buttonSep, hasValue);
    toggleElem(this.defaultDisplay, !hasValue);
    toggleElem(this.display, hasValue);
    if (hasValue) {
      const id = this.getAssetIdFromVal();
      this.display.textContent = `#${id}, ${name}`;
      this.display.href = window.baseUrl(`/link/${id}`);
    }
  }
  getAssetIdFromVal() {
    return Number(this.value);
  }
};

// resources/js/components/permissions-table.js
var PermissionsTable = class extends Component {
  setup() {
    this.container = this.$el;
    this.cellSelector = this.$opts.cellSelector || "td,th";
    this.rowSelector = this.$opts.rowSelector || "tr";
    for (const toggleAllElem of this.$manyRefs.toggleAll || []) {
      toggleAllElem.addEventListener("click", this.toggleAllClick.bind(this));
    }
    for (const toggleRowElem of this.$manyRefs.toggleRow || []) {
      toggleRowElem.addEventListener("click", this.toggleRowClick.bind(this));
    }
    for (const toggleColElem of this.$manyRefs.toggleColumn || []) {
      toggleColElem.addEventListener("click", this.toggleColumnClick.bind(this));
    }
  }
  toggleAllClick(event) {
    event.preventDefault();
    this.toggleAllInElement(this.container);
  }
  toggleRowClick(event) {
    event.preventDefault();
    this.toggleAllInElement(event.target.closest(this.rowSelector));
  }
  toggleColumnClick(event) {
    event.preventDefault();
    const tableCell = event.target.closest(this.cellSelector);
    const colIndex = Array.from(tableCell.parentElement.children).indexOf(tableCell);
    const tableRows = this.container.querySelectorAll(this.rowSelector);
    const inputsToToggle = [];
    for (const row of tableRows) {
      const targetCell = row.children[colIndex];
      if (targetCell) {
        inputsToToggle.push(...targetCell.querySelectorAll("input[type=checkbox]"));
      }
    }
    this.toggleAllInputs(inputsToToggle);
  }
  toggleAllInElement(domElem) {
    const inputsToToggle = domElem.querySelectorAll("input[type=checkbox]");
    this.toggleAllInputs(inputsToToggle);
  }
  toggleAllInputs(inputsToToggle) {
    const currentState = inputsToToggle.length > 0 ? inputsToToggle[0].checked : false;
    for (const checkbox of inputsToToggle) {
      checkbox.checked = !currentState;
      checkbox.dispatchEvent(new Event("change"));
    }
  }
};

// resources/js/components/pointer.ts
var Pointer = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "showing", false);
    __publicField(this, "isMakingSelection", false);
    __publicField(this, "targetElement", null);
    __publicField(this, "targetSelectionRange", null);
    __publicField(this, "pointer");
    __publicField(this, "linkInput");
    __publicField(this, "linkButton");
    __publicField(this, "includeInput");
    __publicField(this, "includeButton");
    __publicField(this, "sectionModeButton");
    __publicField(this, "commentButton");
    __publicField(this, "modeToggles");
    __publicField(this, "modeSections");
    __publicField(this, "pageId");
  }
  setup() {
    this.pointer = this.$refs.pointer;
    this.linkInput = this.$refs.linkInput;
    this.linkButton = this.$refs.linkButton;
    this.includeInput = this.$refs.includeInput;
    this.includeButton = this.$refs.includeButton;
    this.sectionModeButton = this.$refs.sectionModeButton;
    this.commentButton = this.$refs.commentButton;
    this.modeToggles = this.$manyRefs.modeToggle;
    this.modeSections = this.$manyRefs.modeSection;
    this.pageId = this.$opts.pageId;
    this.setupListeners();
  }
  setupListeners() {
    this.includeButton.addEventListener("click", () => copyTextToClipboard(this.includeInput.value));
    this.linkButton.addEventListener("click", () => copyTextToClipboard(this.linkInput.value));
    onSelect([this.includeInput, this.linkInput], (event) => {
      event.target.select();
      event.stopPropagation();
    });
    onEvents(this.pointer, ["click", "focus"], (event) => {
      event.stopPropagation();
    });
    onEvents(document.body, ["click", "focus"], () => {
      if (!this.showing || this.isMakingSelection) return;
      this.hidePointer();
    });
    onEscapePress(this.pointer, this.hidePointer.bind(this));
    const pageContent = document.querySelector(".page-content");
    onEvents(pageContent, ["mouseup", "keyup"], (event) => {
      event.stopPropagation();
      const targetEl = event.target.closest('[id^="bkmrk"]');
      if (targetEl instanceof HTMLElement && (window.getSelection() || "").toString().length > 0) {
        const xPos = event instanceof MouseEvent ? event.pageX : 0;
        this.showPointerAtTarget(targetEl, xPos, false);
      }
    });
    onSelect(this.sectionModeButton, this.enterSectionSelectMode.bind(this));
    onSelect(this.modeToggles, (event) => {
      const targetToggle = event.target;
      for (const section of this.modeSections) {
        const show2 = !section.contains(targetToggle);
        section.toggleAttribute("hidden", !show2);
      }
      const otherToggle = this.modeToggles.find((b) => b !== targetToggle);
      otherToggle && otherToggle.focus();
    });
    if (this.commentButton) {
      onSelect(this.commentButton, this.createCommentAtPointer.bind(this));
    }
  }
  hidePointer() {
    this.pointer.style.removeProperty("display");
    this.showing = false;
    this.targetElement = null;
    this.targetSelectionRange = null;
  }
  /**
   * Move and display the pointer at the given element, targeting the given screen x-position if possible.
   */
  showPointerAtTarget(element, xPosition, keyboardMode) {
    this.targetElement = element;
    this.targetSelectionRange = window.getSelection()?.getRangeAt(0) || null;
    this.updateDomForTarget(element);
    this.pointer.style.display = "block";
    const targetBounds = element.getBoundingClientRect();
    const pointerBounds = this.pointer.getBoundingClientRect();
    const xTarget = Math.min(Math.max(xPosition, targetBounds.left), targetBounds.right);
    const xOffset = xTarget - pointerBounds.width / 2;
    const yOffset = targetBounds.top - pointerBounds.height - 16;
    this.pointer.style.left = `${xOffset}px`;
    this.pointer.style.top = `${yOffset}px`;
    this.showing = true;
    this.isMakingSelection = true;
    setTimeout(() => {
      this.isMakingSelection = false;
    }, 100);
    const scrollListener = () => {
      this.hidePointer();
      window.removeEventListener("scroll", scrollListener);
    };
    element.parentElement?.insertBefore(this.pointer, element);
    if (!keyboardMode) {
      window.addEventListener("scroll", scrollListener, { passive: true });
    }
  }
  /**
   * Update the pointer inputs/content for the given target element.
   */
  updateDomForTarget(element) {
    const permaLink = window.baseUrl(`/link/${this.pageId}#${element.id}`);
    const includeTag = `{{@${this.pageId}#${element.id}}}`;
    this.linkInput.value = permaLink;
    this.includeInput.value = includeTag;
    const editAnchor = this.pointer.querySelector("#pointer-edit");
    if (editAnchor instanceof HTMLAnchorElement && element) {
      const { editHref } = editAnchor.dataset;
      const elementId = element.id;
      const queryContent = (element.textContent || "").substring(0, 50);
      editAnchor.href = `${editHref}?content-id=${elementId}&content-text=${encodeURIComponent(queryContent)}`;
    }
  }
  enterSectionSelectMode() {
    const sections = Array.from(document.querySelectorAll('.page-content [id^="bkmrk"]'));
    for (const section of sections) {
      section.setAttribute("tabindex", "0");
    }
    sections[0].focus();
    onEnterPress(sections, (event) => {
      this.showPointerAtTarget(event.target, 0, true);
      this.pointer.focus();
    });
  }
  createCommentAtPointer() {
    if (!this.targetElement) {
      return;
    }
    const refId = this.targetElement.id;
    const hash = hashElement(this.targetElement);
    let range = "";
    if (this.targetSelectionRange) {
      const commonContainer = this.targetSelectionRange.commonAncestorContainer;
      if (this.targetElement.contains(commonContainer)) {
        const start = normalizeNodeTextOffsetToParent(
          this.targetSelectionRange.startContainer,
          this.targetSelectionRange.startOffset,
          this.targetElement
        );
        const end = normalizeNodeTextOffsetToParent(
          this.targetSelectionRange.endContainer,
          this.targetSelectionRange.endOffset,
          this.targetElement
        );
        range = `${start}-${end}`;
      }
    }
    const reference = `${refId}:${hash}:${range}`;
    const pageComments = window.$components.first("page-comments");
    pageComments.startNewComment(reference);
  }
};

// resources/js/components/popup.js
var Popup = class extends Component {
  setup() {
    this.container = this.$el;
    this.hideButtons = this.$manyRefs.hide || [];
    this.onkeyup = null;
    this.onHide = null;
    this.setupListeners();
  }
  setupListeners() {
    let lastMouseDownTarget = null;
    this.container.addEventListener("mousedown", (event) => {
      lastMouseDownTarget = event.target;
    });
    this.container.addEventListener("click", (event) => {
      if (event.target === this.container && lastMouseDownTarget === this.container) {
        this.hide();
      }
    });
    onSelect(this.hideButtons, () => this.hide());
  }
  hide(onComplete = null) {
    fadeOut(this.container, 120, onComplete);
    if (this.onkeyup) {
      window.removeEventListener("keyup", this.onkeyup);
      this.onkeyup = null;
    }
    if (this.onHide) {
      this.onHide();
    }
  }
  show(onComplete = null, onHide = null) {
    fadeIn(this.container, 120, onComplete);
    this.onkeyup = (event) => {
      if (event.key === "Escape") {
        this.hide();
      }
    };
    window.addEventListener("keyup", this.onkeyup);
    this.onHide = onHide;
  }
};

// resources/js/components/setting-app-color-scheme.js
var SettingAppColorScheme = class extends Component {
  setup() {
    this.container = this.$el;
    this.mode = this.$opts.mode;
    this.lightContainer = this.$refs.lightContainer;
    this.darkContainer = this.$refs.darkContainer;
    this.container.addEventListener("tabs-change", (event) => {
      const panel = event.detail.showing;
      const newMode = panel === "color-scheme-panel-light" ? "light" : "dark";
      this.handleModeChange(newMode);
    });
    const onInputChange = (event) => {
      this.updateAppColorsFromInputs();
      if (event.target.name.startsWith("setting-app-color")) {
        this.updateLightForInput(event.target);
      }
    };
    this.container.addEventListener("change", onInputChange);
    this.container.addEventListener("input", onInputChange);
  }
  handleModeChange(newMode) {
    this.mode = newMode;
    const isDark = newMode === "dark";
    document.documentElement.classList.toggle("dark-mode", isDark);
    this.updateAppColorsFromInputs();
  }
  updateAppColorsFromInputs() {
    const inputContainer = this.mode === "dark" ? this.darkContainer : this.lightContainer;
    const inputs = inputContainer.querySelectorAll('input[type="color"]');
    for (const input of inputs) {
      const splitName = input.name.split("-");
      const colorPos = splitName.indexOf("color");
      let cssId = splitName.slice(1, colorPos).join("-");
      if (cssId === "app") {
        cssId = "primary";
      }
      const varName = `--color-${cssId}`;
      document.body.style.setProperty(varName, input.value);
    }
  }
  /**
   * Update the 'light' app color variant for the given input.
   * @param {HTMLInputElement} input
   */
  updateLightForInput(input) {
    const lightName = input.name.replace("-color", "-color-light");
    const hexVal = input.value;
    const rgb = this.hexToRgb(hexVal);
    const rgbLightVal = `rgba(${[rgb.r, rgb.g, rgb.b, "0.15"].join(",")})`;
    const lightColorInput = this.container.querySelector(`input[name="${lightName}"][type="hidden"]`);
    lightColorInput.value = rgbLightVal;
  }
  /**
   * Covert a hex color code to rgb components.
   * @attribution https://stackoverflow.com/a/5624139
   * @param {String} hex
   * @returns {{r: Number, g: Number, b: Number}}
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
      r: result ? parseInt(result[1], 16) : 0,
      g: result ? parseInt(result[2], 16) : 0,
      b: result ? parseInt(result[3], 16) : 0
    };
  }
};

// resources/js/components/setting-color-picker.js
var SettingColorPicker = class extends Component {
  setup() {
    this.colorInput = this.$refs.input;
    this.resetButton = this.$refs.resetButton;
    this.defaultButton = this.$refs.defaultButton;
    this.currentColor = this.$opts.current;
    this.defaultColor = this.$opts.default;
    this.resetButton.addEventListener("click", () => this.setValue(this.currentColor));
    this.defaultButton.addEventListener("click", () => this.setValue(this.defaultColor));
  }
  setValue(value) {
    this.colorInput.value = value;
    this.colorInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
};

// resources/js/components/setting-homepage-control.js
var SettingHomepageControl = class extends Component {
  setup() {
    this.typeControl = this.$refs.typeControl;
    this.pagePickerContainer = this.$refs.pagePickerContainer;
    this.typeControl.addEventListener("change", this.controlPagePickerVisibility.bind(this));
    this.controlPagePickerVisibility();
  }
  controlPagePickerVisibility() {
    const showPagePicker = this.typeControl.value === "page";
    this.pagePickerContainer.style.display = showPagePicker ? "block" : "none";
  }
};

// resources/js/services/dual-lists.ts
function buildListActions(availableList, configuredList) {
  return {
    move_up(item) {
      const list = item.parentNode;
      const index2 = Array.from(list.children).indexOf(item);
      const newIndex2 = Math.max(index2 - 1, 0);
      list.insertBefore(item, list.children[newIndex2] || null);
    },
    move_down(item) {
      const list = item.parentNode;
      const index2 = Array.from(list.children).indexOf(item);
      const newIndex2 = Math.min(index2 + 2, list.children.length);
      list.insertBefore(item, list.children[newIndex2] || null);
    },
    remove(item) {
      availableList.appendChild(item);
    },
    add(item) {
      configuredList.appendChild(item);
    }
  };
}
function sortActionClickListener(actions, onChange) {
  return (event) => {
    const sortItemAction = event.target.closest(".scroll-box-item button[data-action]");
    if (sortItemAction) {
      const sortItem = sortItemAction.closest(".scroll-box-item");
      const action = sortItemAction.dataset.action;
      if (!action) {
        throw new Error("No action defined for clicked button");
      }
      const actionFunction = actions[action];
      actionFunction(sortItem);
      onChange();
    }
  };
}

// resources/js/components/shelf-sort.js
var ShelfSort = class extends Component {
  setup() {
    this.elem = this.$el;
    this.input = this.$refs.input;
    this.shelfBookList = this.$refs.shelfBookList;
    this.allBookList = this.$refs.allBookList;
    this.bookSearchInput = this.$refs.bookSearch;
    this.sortButtonContainer = this.$refs.sortButtonContainer;
    this.lastSort = null;
    this.initSortable();
    this.setupListeners();
  }
  initSortable() {
    const scrollBoxes = this.elem.querySelectorAll(".scroll-box");
    for (const scrollBox of scrollBoxes) {
      new sortable_esm_default(scrollBox, {
        group: "shelf-books",
        ghostClass: "primary-background-light",
        handle: ".handle",
        animation: 150,
        onSort: this.onChange.bind(this)
      });
    }
  }
  setupListeners() {
    const listActions = buildListActions(this.allBookList, this.shelfBookList);
    const sortActionListener = sortActionClickListener(listActions, this.onChange.bind(this));
    this.elem.addEventListener("click", sortActionListener);
    this.bookSearchInput.addEventListener("input", () => {
      this.filterBooksByName(this.bookSearchInput.value);
    });
    this.sortButtonContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-sort]");
      if (button) {
        this.sortShelfBooks(button.dataset.sort);
      }
    });
  }
  /**
   * @param {String} filterVal
   */
  filterBooksByName(filterVal) {
    if (!this.allBookList.style.height) {
      this.allBookList.style.height = `${this.allBookList.getBoundingClientRect().height}px`;
    }
    const books = this.allBookList.children;
    const lowerFilter = filterVal.trim().toLowerCase();
    for (const bookEl of books) {
      const show2 = !filterVal || bookEl.textContent.toLowerCase().includes(lowerFilter);
      bookEl.style.display = show2 ? null : "none";
    }
  }
  onChange() {
    const shelfBookElems = Array.from(this.shelfBookList.querySelectorAll("[data-id]"));
    this.input.value = shelfBookElems.map((elem2) => elem2.getAttribute("data-id")).join(",");
  }
  sortShelfBooks(sortProperty) {
    const books = Array.from(this.shelfBookList.children);
    const reverse = sortProperty === this.lastSort;
    books.sort((bookA, bookB) => {
      const aProp = bookA.dataset[sortProperty].toLowerCase();
      const bProp = bookB.dataset[sortProperty].toLowerCase();
      if (reverse) {
        return bProp.localeCompare(aProp);
      }
      return aProp.localeCompare(bProp);
    });
    for (const book of books) {
      this.shelfBookList.append(book);
    }
    this.lastSort = this.lastSort === sortProperty ? null : sortProperty;
    this.onChange();
  }
};

// resources/js/components/shortcuts.js
function reverseMap(map) {
  const reversed = {};
  for (const [key, value] of Object.entries(map)) {
    reversed[value] = key;
  }
  return reversed;
}
var Shortcuts = class extends Component {
  setup() {
    this.container = this.$el;
    this.mapById = JSON.parse(this.$opts.keyMap);
    this.mapByShortcut = reverseMap(this.mapById);
    this.hintsShowing = false;
    this.hideHints = this.hideHints.bind(this);
    this.hintAbortController = null;
    this.setupListeners();
  }
  setupListeners() {
    window.addEventListener("keydown", (event) => {
      if (event.target.closest("input, select, textarea, .cm-editor, .editor-container")) {
        return;
      }
      if (event.key === "?") {
        if (this.hintsShowing) {
          this.hideHints();
        } else {
          this.showHints();
        }
        return;
      }
      this.handleShortcutPress(event);
    });
  }
  /**
   * @param {KeyboardEvent} event
   */
  handleShortcutPress(event) {
    const keys = [
      event.ctrlKey ? "Ctrl" : "",
      event.metaKey ? "Cmd" : "",
      event.key
    ];
    const combo = keys.filter((s) => Boolean(s)).join(" + ");
    const shortcutId = this.mapByShortcut[combo];
    if (shortcutId) {
      const wasHandled = this.runShortcut(shortcutId);
      if (wasHandled) {
        event.preventDefault();
      }
    }
  }
  /**
   * Run the given shortcut, and return a boolean to indicate if the event
   * was successfully handled by a shortcut action.
   * @param {String} id
   * @return {boolean}
   */
  runShortcut(id) {
    const el2 = this.container.querySelector(`[data-shortcut="${id}"]`);
    if (!el2) {
      return false;
    }
    if (el2.matches("input, textarea, select")) {
      el2.focus();
      return true;
    }
    if (el2.matches("a, button")) {
      el2.click();
      return true;
    }
    if (el2.matches("div[tabindex]")) {
      el2.click();
      el2.focus();
      return true;
    }
    console.error("Shortcut attempted to be ran for element type that does not have handling setup", el2);
    return false;
  }
  showHints() {
    const wrapper = document.createElement("div");
    wrapper.classList.add("shortcut-container");
    this.container.append(wrapper);
    const shortcutEls = this.container.querySelectorAll("[data-shortcut]");
    const displayedIds = /* @__PURE__ */ new Set();
    for (const shortcutEl of shortcutEls) {
      const id = shortcutEl.getAttribute("data-shortcut");
      if (displayedIds.has(id)) {
        continue;
      }
      const key = this.mapById[id];
      this.showHintLabel(shortcutEl, key, wrapper);
      displayedIds.add(id);
    }
    this.hintAbortController = new AbortController();
    const signal = this.hintAbortController.signal;
    window.addEventListener("scroll", this.hideHints, { signal });
    window.addEventListener("focus", this.hideHints, { signal });
    window.addEventListener("blur", this.hideHints, { signal });
    window.addEventListener("click", this.hideHints, { signal });
    this.hintsShowing = true;
  }
  /**
   * @param {Element} targetEl
   * @param {String} key
   * @param {Element} wrapper
   */
  showHintLabel(targetEl, key, wrapper) {
    const targetBounds = targetEl.getBoundingClientRect();
    const label = document.createElement("div");
    label.classList.add("shortcut-hint");
    label.textContent = key;
    const linkage = document.createElement("div");
    linkage.classList.add("shortcut-linkage");
    linkage.style.left = `${targetBounds.x}px`;
    linkage.style.top = `${targetBounds.y}px`;
    linkage.style.width = `${targetBounds.width}px`;
    linkage.style.height = `${targetBounds.height}px`;
    wrapper.append(label, linkage);
    const labelBounds = label.getBoundingClientRect();
    label.style.insetInlineStart = `${targetBounds.x + targetBounds.width - (labelBounds.width + 6)}px`;
    label.style.insetBlockStart = `${targetBounds.y + (targetBounds.height - labelBounds.height) / 2}px`;
  }
  hideHints() {
    const wrapper = this.container.querySelector(".shortcut-container");
    wrapper.remove();
    this.hintAbortController?.abort();
    this.hintsShowing = false;
  }
};

// resources/js/components/shortcut-input.js
var ignoreKeys = ["Control", "Alt", "Shift", "Meta", "Super", " ", "+", "Tab", "Escape"];
var ShortcutInput = class extends Component {
  setup() {
    this.input = this.$el;
    this.setupListeners();
  }
  setupListeners() {
    this.listenerRecordKey = this.listenerRecordKey.bind(this);
    this.input.addEventListener("focus", () => {
      this.startListeningForInput();
    });
    this.input.addEventListener("blur", () => {
      this.stopListeningForInput();
    });
  }
  startListeningForInput() {
    this.input.addEventListener("keydown", this.listenerRecordKey);
  }
  /**
   * @param {KeyboardEvent} event
   */
  listenerRecordKey(event) {
    if (ignoreKeys.includes(event.key)) {
      return;
    }
    const keys = [
      event.ctrlKey ? "Ctrl" : "",
      event.metaKey ? "Cmd" : "",
      event.key
    ];
    this.input.value = keys.filter((s) => Boolean(s)).join(" + ");
  }
  stopListeningForInput() {
    this.input.removeEventListener("keydown", this.listenerRecordKey);
  }
};

// resources/js/components/sortable-list.js
var SortableList = class extends Component {
  setup() {
    this.container = this.$el;
    this.handleSelector = this.$opts.handleSelector;
    const sortable = new sortable_esm_default(this.container, {
      handle: this.handleSelector,
      animation: 150,
      onSort: () => {
        this.$emit("sort", { ids: sortable.toArray() });
      },
      setData(dataTransferItem, dragEl2) {
        const jsonContent = dragEl2.getAttribute("data-drag-content");
        if (jsonContent) {
          const contentByType = JSON.parse(jsonContent);
          for (const [type, content] of Object.entries(contentByType)) {
            dataTransferItem.setData(type, content);
          }
        }
      },
      revertOnSpill: true,
      dropBubble: true,
      dragoverBubble: false
    });
  }
};

// resources/js/components/sort-rule-manager.ts
var SortRuleManager = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "input");
    __publicField(this, "configuredList");
    __publicField(this, "availableList");
  }
  setup() {
    this.input = this.$refs.input;
    this.configuredList = this.$refs.configuredOperationsList;
    this.availableList = this.$refs.availableOperationsList;
    this.initSortable();
    const listActions = buildListActions(this.availableList, this.configuredList);
    const sortActionListener = sortActionClickListener(listActions, this.onChange.bind(this));
    this.$el.addEventListener("click", sortActionListener);
  }
  initSortable() {
    const scrollBoxes = [this.configuredList, this.availableList];
    for (const scrollBox of scrollBoxes) {
      new sortable_esm_default(scrollBox, {
        group: "sort-rule-operations",
        ghostClass: "primary-background-light",
        handle: ".handle",
        animation: 150,
        onSort: this.onChange.bind(this)
      });
    }
  }
  onChange() {
    const configuredOpEls = Array.from(this.configuredList.querySelectorAll("[data-id]"));
    this.input.value = configuredOpEls.map((elem2) => elem2.getAttribute("data-id")).join(",");
  }
};

// resources/js/components/submit-on-change.js
var SubmitOnChange = class extends Component {
  setup() {
    this.filter = this.$opts.filter;
    this.$el.addEventListener("change", (event) => {
      if (this.filter && !event.target.matches(this.filter)) {
        return;
      }
      const form = this.$el.closest("form");
      if (form) {
        form.submit();
      }
    });
  }
};

// resources/js/components/tag-manager.js
var TagManager = class extends Component {
  setup() {
    this.addRemoveComponentEl = this.$refs.addRemove;
    this.container = this.$el;
    this.rowSelector = this.$opts.rowSelector;
    this.setupListeners();
  }
  setupListeners() {
    this.container.addEventListener("input", (event) => {
      const addRemoveComponent = window.$components.firstOnElement(this.addRemoveComponentEl, "add-remove-rows");
      if (!this.hasEmptyRows() && event.target.value) {
        addRemoveComponent.add();
      }
    });
  }
  hasEmptyRows() {
    const rows = this.container.querySelectorAll(this.rowSelector);
    const firstEmpty = [...rows].find((row) => [...row.querySelectorAll("input")].filter((input) => input.value).length === 0);
    return firstEmpty !== void 0;
  }
};

// resources/js/components/template-manager.js
var TemplateManager = class extends Component {
  setup() {
    this.container = this.$el;
    this.list = this.$refs.list;
    this.searchInput = this.$refs.searchInput;
    this.searchButton = this.$refs.searchButton;
    this.searchCancel = this.$refs.searchCancel;
    this.setupListeners();
  }
  setupListeners() {
    onChildEvent(this.container, "[template-action]", "click", this.handleTemplateActionClick.bind(this));
    onChildEvent(this.container, ".pagination a", "click", this.handlePaginationClick.bind(this));
    onChildEvent(this.container, ".template-item-content", "click", this.handleTemplateItemClick.bind(this));
    onChildEvent(this.container, ".template-item", "dragstart", this.handleTemplateItemDragStart.bind(this));
    this.searchInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.performSearch();
      }
    });
    this.searchButton.addEventListener("click", () => this.performSearch());
    this.searchCancel.addEventListener("click", () => {
      this.searchInput.value = "";
      this.performSearch();
    });
  }
  handleTemplateItemClick(event, templateItem) {
    const templateId = templateItem.closest("[template-id]").getAttribute("template-id");
    this.insertTemplate(templateId, "replace");
  }
  handleTemplateItemDragStart(event, templateItem) {
    const templateId = templateItem.closest("[template-id]").getAttribute("template-id");
    event.dataTransfer.setData("bookstack/template", templateId);
    event.dataTransfer.setData("text/plain", templateId);
  }
  handleTemplateActionClick(event, actionButton) {
    event.stopPropagation();
    const action = actionButton.getAttribute("template-action");
    const templateId = actionButton.closest("[template-id]").getAttribute("template-id");
    this.insertTemplate(templateId, action);
  }
  async insertTemplate(templateId, action = "replace") {
    const resp = await window.$http.get(`/templates/${templateId}`);
    const eventName = `editor::${action}`;
    window.$events.emit(eventName, resp.data);
  }
  async handlePaginationClick(event, paginationLink) {
    event.preventDefault();
    const paginationUrl = paginationLink.getAttribute("href");
    const resp = await window.$http.get(paginationUrl);
    this.list.innerHTML = resp.data;
  }
  async performSearch() {
    const searchTerm = this.searchInput.value;
    const resp = await window.$http.get("/templates", {
      search: searchTerm
    });
    this.searchCancel.style.display = searchTerm ? "block" : "none";
    this.list.innerHTML = resp.data;
  }
};

// resources/js/components/toggle-switch.js
var ToggleSwitch = class extends Component {
  setup() {
    this.input = this.$el.querySelector("input[type=hidden]");
    this.checkbox = this.$el.querySelector("input[type=checkbox]");
    this.checkbox.addEventListener("change", this.stateChange.bind(this));
  }
  stateChange() {
    this.input.value = this.checkbox.checked ? "true" : "false";
    const changeEvent = new Event("change");
    this.input.dispatchEvent(changeEvent);
  }
};

// resources/js/components/tri-layout.ts
var TriLayout = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "container");
    __publicField(this, "tabs");
    __publicField(this, "sidebarScrollContainers");
    __publicField(this, "lastLayoutType", "none");
    __publicField(this, "onDestroy", null);
    __publicField(this, "scrollCache", {
      content: 0,
      info: 0
    });
    __publicField(this, "lastTabShown", "content");
  }
  setup() {
    this.container = this.$refs.container;
    this.tabs = this.$manyRefs.tab;
    this.sidebarScrollContainers = this.$manyRefs.sidebarScrollContainer;
    this.mobileTabClick = this.mobileTabClick.bind(this);
    this.updateLayout();
    window.addEventListener("resize", () => {
      this.updateLayout();
    }, { passive: true });
    this.setupSidebarScrollHandlers();
  }
  updateLayout() {
    let newLayout = "tablet";
    if (window.innerWidth <= 1e3) newLayout = "mobile";
    if (window.innerWidth > 1400) newLayout = "desktop";
    if (newLayout === this.lastLayoutType) return;
    if (this.onDestroy) {
      this.onDestroy();
      this.onDestroy = null;
    }
    if (newLayout === "desktop") {
      this.setupDesktop();
    } else if (newLayout === "mobile") {
      this.setupMobile();
    }
    this.lastLayoutType = newLayout;
  }
  setupMobile() {
    for (const tab of this.tabs) {
      tab.addEventListener("click", this.mobileTabClick);
    }
    this.onDestroy = () => {
      for (const tab of this.tabs) {
        tab.removeEventListener("click", this.mobileTabClick);
      }
    };
  }
  setupDesktop() {
  }
  /**
   * Action to run when the mobile info toggle bar is clicked/tapped
   */
  mobileTabClick(event) {
    const tab = event.target.dataset.tab || "";
    this.showTab(tab);
  }
  /**
   * Show the content tab.
   * Used by the page-display component.
   */
  showContent() {
    this.showTab("content", false);
  }
  /**
   * Show the given tab
   */
  showTab(tabName, scroll = true) {
    this.scrollCache[this.lastTabShown] = document.documentElement.scrollTop;
    for (const tab of this.tabs) {
      const isActive = tab.dataset.tab === tabName;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    const showInfo = tabName === "info";
    this.container.classList.toggle("show-info", showInfo);
    if (scroll) {
      const pageHeader = document.querySelector("header");
      const defaultScrollTop = pageHeader.getBoundingClientRect().bottom;
      document.documentElement.scrollTop = this.scrollCache[tabName] || defaultScrollTop;
      setTimeout(() => {
        document.documentElement.scrollTop = this.scrollCache[tabName] || defaultScrollTop;
      }, 50);
    }
    this.lastTabShown = tabName;
  }
  setupSidebarScrollHandlers() {
    for (const sidebar of this.sidebarScrollContainers) {
      sidebar.addEventListener("scroll", () => this.handleSidebarScroll(sidebar), {
        passive: true
      });
      this.handleSidebarScroll(sidebar);
    }
    window.addEventListener("resize", () => {
      for (const sidebar of this.sidebarScrollContainers) {
        this.handleSidebarScroll(sidebar);
      }
    });
  }
  handleSidebarScroll(sidebar) {
    const scrollable = sidebar.clientHeight !== sidebar.scrollHeight;
    const atTop = sidebar.scrollTop === 0;
    const atBottom = sidebar.scrollTop + sidebar.clientHeight === sidebar.scrollHeight;
    if (sidebar.parentElement) {
      sidebar.parentElement.classList.toggle("scroll-away-from-top", !atTop && scrollable);
      sidebar.parentElement.classList.toggle("scroll-away-from-bottom", !atBottom && scrollable);
    }
  }
};

// resources/js/components/user-select.js
var UserSelect = class extends Component {
  setup() {
    this.container = this.$el;
    this.input = this.$refs.input;
    this.userInfoContainer = this.$refs.userInfo;
    onChildEvent(this.container, "a.dropdown-search-item", "click", this.selectUser.bind(this));
  }
  selectUser(event, userEl) {
    event.preventDefault();
    this.input.value = userEl.getAttribute("data-id");
    this.userInfoContainer.innerHTML = userEl.innerHTML;
    this.input.dispatchEvent(new Event("change", { bubbles: true }));
    this.hide();
  }
  hide() {
    const dropdown = window.$components.firstOnElement(this.container, "dropdown");
    dropdown.hide();
  }
};

// resources/js/components/webhook-events.js
var WebhookEvents = class extends Component {
  setup() {
    this.checkboxes = this.$el.querySelectorAll('input[type="checkbox"]');
    this.allCheckbox = this.$el.querySelector('input[type="checkbox"][value="all"]');
    this.$el.addEventListener("change", (event) => {
      if (event.target.checked && event.target === this.allCheckbox) {
        this.deselectIndividualEvents();
      } else if (event.target.checked) {
        this.allCheckbox.checked = false;
      }
    });
  }
  deselectIndividualEvents() {
    for (const checkbox of this.checkboxes) {
      if (checkbox !== this.allCheckbox) {
        checkbox.checked = false;
      }
    }
  }
};

// resources/js/components/wysiwyg-editor.js
var WysiwygEditor = class extends Component {
  setup() {
    this.elem = this.$el;
    this.editContainer = this.$refs.editContainer;
    this.input = this.$refs.input;
    this.editor = null;
    const translations = {
      ...window.editor_translations,
      imageUploadErrorText: this.$opts.imageUploadErrorText,
      serverUploadLimitText: this.$opts.serverUploadLimitText
    };
    window.importVersioned("wysiwyg").then((wysiwyg) => {
      const editorContent = this.input.value;
      this.editor = wysiwyg.createPageEditorInstance(this.editContainer, editorContent, {
        drawioUrl: this.getDrawIoUrl(),
        pageId: Number(this.$opts.pageId),
        darkMode: document.documentElement.classList.contains("dark-mode"),
        textDirection: this.$opts.textDirection,
        translations
      });
      window.wysiwyg = this.editor;
    });
    let handlingFormSubmit = false;
    this.input.form.addEventListener("submit", (event) => {
      if (!this.editor) {
        return;
      }
      if (!handlingFormSubmit) {
        event.preventDefault();
        handlingFormSubmit = true;
        this.editor.getContentAsHtml().then((html) => {
          this.input.value = html;
          setTimeout(() => {
            this.input.form.requestSubmit();
          }, 5);
        });
      } else {
        handlingFormSubmit = false;
      }
    });
  }
  getDrawIoUrl() {
    const drawioUrlElem = document.querySelector("[drawio-url]");
    if (drawioUrlElem) {
      return drawioUrlElem.getAttribute("drawio-url");
    }
    return "";
  }
  /**
   * Get the content of this editor.
   * Used by the parent page editor component.
   * @return {Promise<{html: String}>}
   */
  async getContent() {
    return {
      html: await this.editor.getContentAsHtml()
    };
  }
};

// resources/js/wysiwyg-tinymce/shortcuts.js
function register(editor) {
  for (let i = 1; i < 5; i++) {
    editor.shortcuts.add(`meta+${i}`, "", ["FormatBlock", false, `h${i + 1}`]);
  }
  editor.shortcuts.add("meta+5", "", ["FormatBlock", false, "p"]);
  editor.shortcuts.add("meta+d", "", ["FormatBlock", false, "p"]);
  editor.shortcuts.add("meta+6", "", ["FormatBlock", false, "blockquote"]);
  editor.shortcuts.add("meta+q", "", ["FormatBlock", false, "blockquote"]);
  editor.shortcuts.add("meta+7", "", ["codeeditor", false, "pre"]);
  editor.shortcuts.add("meta+e", "", ["codeeditor", false, "pre"]);
  editor.shortcuts.add("meta+8", "", ["FormatBlock", false, "code"]);
  editor.shortcuts.add("meta+shift+E", "", ["FormatBlock", false, "code"]);
  editor.shortcuts.add("meta+o", "", "InsertOrderedList");
  editor.shortcuts.add("meta+p", "", "InsertUnorderedList");
  editor.shortcuts.add("meta+S", "", () => {
    window.$events.emit("editor-save-draft");
  });
  editor.shortcuts.add("meta+13", "", () => {
    window.$events.emit("editor-save-page");
  });
  editor.shortcuts.add("meta+9", "", () => {
    const selectedNode = editor.selection.getNode();
    const callout = selectedNode ? selectedNode.closest(".callout") : null;
    const formats2 = ["info", "success", "warning", "danger"];
    const currentFormatIndex = formats2.findIndex((format) => {
      return callout && callout.classList.contains(format);
    });
    const newFormatIndex = (currentFormatIndex + 1) % formats2.length;
    const newFormat = formats2[newFormatIndex];
    editor.formatter.apply(`callout${newFormat}`);
  });
  editor.shortcuts.add("meta+shift+K", "", () => {
    const selectorPopup = window.$components.first("entity-selector-popup");
    const selectionText = editor.selection.getContent({ format: "text" }).trim();
    selectorPopup.show((entity) => {
      if (editor.selection.isCollapsed()) {
        editor.insertContent(editor.dom.createHTML("a", { href: entity.link }, editor.dom.encode(entity.name)));
      } else {
        editor.formatter.apply("link", { href: entity.link });
      }
      editor.selection.collapse(false);
      editor.focus();
    }, {
      initialValue: selectionText,
      searchEndpoint: "/search/entity-selector",
      entityTypes: "page,book,chapter,bookshelf",
      entityPermission: "view"
    });
  });
}

// resources/js/wysiwyg-tinymce/common-events.js
function listen(editor) {
  window.$events.listen("editor::replace", ({ html }) => {
    editor.setContent(html);
  });
  window.$events.listen("editor::append", ({ html }) => {
    const content = editor.getContent() + html;
    editor.setContent(content);
  });
  window.$events.listen("editor::prepend", ({ html }) => {
    const content = html + editor.getContent();
    editor.setContent(content);
  });
  window.$events.listen("editor::insert", ({ html }) => {
    editor.insertContent(html);
  });
  window.$events.listen("editor::focus", () => {
    if (editor.initialized) {
      editor.focus();
    }
  });
}

// resources/js/wysiwyg-tinymce/scrolling.js
function scrollToText(editor, scrollId) {
  const element = editor.dom.get(encodeURIComponent(scrollId).replace(/!/g, "%21"));
  if (!element) {
    return;
  }
  element.scrollIntoView();
  editor.selection.select(element, true);
  editor.selection.collapse(false);
  editor.focus();
}
function scrollToQueryString(editor) {
  const queryParams = new URL(window.location).searchParams;
  const scrollId = queryParams.get("content-id");
  if (scrollId) {
    scrollToText(editor, scrollId);
  }
}

// resources/js/wysiwyg-tinymce/drop-paste-handling.js
var wrap;
var draggedContentEditable;
function hasTextContent(node) {
  return node && !!(node.textContent || node.innerText);
}
async function uploadImageFile(file, pageId) {
  if (file === null || file.type.indexOf("image") !== 0) {
    throw new Error("Not an image file");
  }
  const remoteFilename = file.name || `image-${Date.now()}.png`;
  const formData = new FormData();
  formData.append("file", file, remoteFilename);
  formData.append("uploaded_to", pageId);
  const resp = await window.$http.post(window.baseUrl("/images/gallery"), formData);
  return resp.data;
}
function paste(editor, options2, event) {
  const clipboard = new Clipboard(event.clipboardData || event.dataTransfer);
  if (!clipboard.hasItems() || clipboard.containsTabularData()) {
    return;
  }
  const images = clipboard.getImages();
  for (const imageFile of images) {
    const id = `image-${Math.random().toString(16).slice(2)}`;
    const loadingImage = window.baseUrl("/loading.gif");
    event.preventDefault();
    setTimeout(() => {
      editor.insertContent(`<p><img src="${loadingImage}" id="${id}"></p>`);
      uploadImageFile(imageFile, options2.pageId).then((resp) => {
        const safeName = resp.name.replace(/"/g, "");
        const newImageHtml = `<img src="${resp.thumbs.display}" alt="${safeName}" />`;
        const newEl = editor.dom.create("a", {
          target: "_blank",
          href: resp.url
        }, newImageHtml);
        editor.dom.replace(newEl, id);
      }).catch((err) => {
        editor.dom.remove(id);
        window.$events.error(err?.data?.message || options2.translations.imageUploadErrorText);
        console.error(err);
      });
    }, 10);
  }
}
function dragStart2(editor) {
  const node = editor.selection.getNode();
  if (node.nodeName === "IMG") {
    wrap = editor.dom.getParent(node, ".mceTemp");
    if (!wrap && node.parentNode.nodeName === "A" && !hasTextContent(node.parentNode)) {
      wrap = node.parentNode;
    }
  }
  if (node.hasAttribute("contenteditable") && node.getAttribute("contenteditable") === "false") {
    draggedContentEditable = node;
  }
}
function drop3(editor, options2, event) {
  const { dom } = editor;
  const rng = window.tinymce.dom.RangeUtils.getCaretRangeFromPoint(
    event.clientX,
    event.clientY,
    editor.getDoc()
  );
  const templateId = event.dataTransfer && event.dataTransfer.getData("bookstack/template");
  if (templateId) {
    event.preventDefault();
    window.$http.get(`/templates/${templateId}`).then((resp) => {
      editor.selection.setRng(rng);
      editor.undoManager.transact(() => {
        editor.execCommand("mceInsertContent", false, resp.data.html);
      });
    });
  }
  if (dom.getParent(rng.startContainer, ".mceTemp")) {
    event.preventDefault();
  } else if (wrap) {
    event.preventDefault();
    editor.undoManager.transact(() => {
      editor.selection.setRng(rng);
      editor.selection.setNode(wrap);
      dom.remove(wrap);
    });
  }
  if (!event.isDefaultPrevented() && draggedContentEditable) {
    event.preventDefault();
    editor.undoManager.transact(() => {
      const selectedNode = editor.selection.getNode();
      const range = editor.selection.getRng();
      const selectedNodeRoot = selectedNode.closest("body > *");
      if (range.startOffset > range.startContainer.length / 2) {
        selectedNodeRoot.after(draggedContentEditable);
      } else {
        selectedNodeRoot.before(draggedContentEditable);
      }
    });
  }
  if (!event.isDefaultPrevented()) {
    paste(editor, options2, event);
  }
  wrap = null;
}
function dragOver(editor, event) {
  event.preventDefault();
  editor.focus();
  const rangeUtils = window.tinymce.dom.RangeUtils;
  const range = rangeUtils.getCaretRangeFromPoint(event.clientX ?? 0, event.clientY ?? 0, editor.getDoc());
  editor.selection.setRng(range);
}
function listenForDragAndPaste(editor, options2) {
  editor.on("dragover", (event) => dragOver(editor, event));
  editor.on("dragstart", () => dragStart2(editor));
  editor.on("drop", (event) => drop3(editor, options2, event));
  editor.on("paste", (event) => paste(editor, options2, event));
}

// resources/js/wysiwyg-tinymce/toolbars.js
function getPrimaryToolbar(options2) {
  const textDirPlugins = options2.textDirection === "rtl" ? "ltr rtl" : "";
  const toolbar = [
    "undo redo",
    "styles",
    "bold italic underline forecolor backcolor formatoverflow",
    "alignleft aligncenter alignright alignjustify",
    "bullist numlist listoverflow",
    textDirPlugins,
    "link customtable imagemanager-insert insertoverflow",
    "code about fullscreen"
  ];
  return toolbar.filter((row) => Boolean(row)).join(" | ");
}
function registerPrimaryToolbarGroups(editor) {
  editor.ui.registry.addGroupToolbarButton("formatoverflow", {
    icon: "more-drawer",
    tooltip: "More",
    items: "strikethrough superscript subscript inlinecode removeformat"
  });
  editor.ui.registry.addGroupToolbarButton("listoverflow", {
    icon: "more-drawer",
    tooltip: "More",
    items: "tasklist outdent indent"
  });
  editor.ui.registry.addGroupToolbarButton("insertoverflow", {
    icon: "more-drawer",
    tooltip: "More",
    items: "customhr codeeditor drawio media details"
  });
}
function registerLinkContextToolbar(editor) {
  editor.ui.registry.addContextToolbar("linkcontexttoolbar", {
    predicate(node) {
      return node.closest("a") !== null;
    },
    position: "node",
    scope: "node",
    items: "link unlink openlink"
  });
}
function registerImageContextToolbar(editor) {
  editor.ui.registry.addContextToolbar("imagecontexttoolbar", {
    predicate(node) {
      return node.closest("img") !== null && !node.hasAttribute("data-mce-object");
    },
    position: "node",
    scope: "node",
    items: "image"
  });
}
function registerObjectContextToolbar(editor) {
  editor.ui.registry.addContextToolbar("objectcontexttoolbar", {
    predicate(node) {
      return node.closest("img") !== null && node.hasAttribute("data-mce-object");
    },
    position: "node",
    scope: "node",
    items: "media"
  });
}
function registerAdditionalToolbars(editor) {
  registerPrimaryToolbarGroups(editor);
  registerLinkContextToolbar(editor);
  registerImageContextToolbar(editor);
  registerObjectContextToolbar(editor);
}

// resources/js/wysiwyg-tinymce/icons.js
var icons = {
  "table-delete-column": '<svg width="24" height="24"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2zm-2 0V5h-4v2.2h-2V5h-2v2.2H9V5H5v14h4v-2.1h2V19h2v-2.1h2V19Z"/><path d="M14.829 10.585 13.415 12l1.414 1.414c.943.943-.472 2.357-1.414 1.414L12 13.414l-1.414 1.414c-.944.944-2.358-.47-1.414-1.414L10.586 12l-1.414-1.415c-.943-.942.471-2.357 1.414-1.414L12 10.585l1.344-1.343c1.111-1.112 2.2.627 1.485 1.343z" style="fill-rule:nonzero"/></svg>',
  "table-delete-row": '<svg width="24" height="24"><path d="M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14c0 1.1-.9 2-2 2zm0-2h14v-4h-2.2v-2H19v-2h-2.2V9H19V5H5v4h2.1v2H5v2h2.1v2H5Z"/><path d="M13.415 14.829 12 13.415l-1.414 1.414c-.943.943-2.357-.472-1.414-1.414L10.586 12l-1.414-1.414c-.944-.944.47-2.358 1.414-1.414L12 10.586l1.415-1.414c.942-.943 2.357.471 1.414 1.414L13.415 12l1.343 1.344c1.112 1.111-.627 2.2-1.343 1.485z" style="fill-rule:nonzero"/></svg>',
  "table-insert-column-after": '<svg width="24" height="24"><path d="M16 5h-5v14h5c1.235 0 1.234 2 0 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11c1.229 0 1.236 2 0 2zm-7 6V5H5v6zm0 8v-6H5v6zm11.076-6h-2v2c0 1.333-2 1.333-2 0v-2h-2c-1.335 0-1.335-2 0-2h2V9c0-1.333 2-1.333 2 0v2h1.9c1.572 0 1.113 2 .1 2z"/></svg>',
  "table-insert-column-before": '<svg width="24" height="24"><path d="M8 19h5V5H8C6.764 5 6.766 3 8 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8c-1.229 0-1.236-2 0-2zm7-6v6h4v-6zm0-8v6h4V5ZM3.924 11h2V9c0-1.333 2-1.333 2 0v2h2c1.335 0 1.335 2 0 2h-2v2c0 1.333-2 1.333-2 0v-2h-1.9c-1.572 0-1.113-2-.1-2z"/></svg>',
  "table-insert-row-above": '<svg width="24" height="24"><path d="M5 8v5h14V8c0-1.235 2-1.234 2 0v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8C3 6.77 5 6.764 5 8zm6 7H5v4h6zm8 0h-6v4h6zM13 3.924v2h2c1.333 0 1.333 2 0 2h-2v2c0 1.335-2 1.335-2 0v-2H9c-1.333 0-1.333-2 0-2h2v-1.9c0-1.572 2-1.113 2-.1z"/></svg>',
  "table-insert-row-after": '<svg width="24" height="24"><path d="M19 16v-5H5v5c0 1.235-2 1.234-2 0V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11c0 1.229-2 1.236-2 0zm-6-7h6V5h-6zM5 9h6V5H5Zm6 11.076v-2H9c-1.333 0-1.333-2 0-2h2v-2c0-1.335 2-1.335 2 0v2h2c1.333 0 1.333 2 0 2h-2v1.9c0 1.572-2 1.113-2 .1z"/></svg>',
  table: '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2ZM5 14v5h6v-5zm14 0h-6v5h6zm0-7h-6v5h6zM5 12h6V7H5Z"/></svg>',
  "table-delete-table": '<svg width="24" height="24"><path d="M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14c0 1.1-.9 2-2 2zm0-2h14V5H5v14z"/><path d="m13.711 15.423-1.71-1.712-1.712 1.712c-1.14 1.14-2.852-.57-1.71-1.712l1.71-1.71-1.71-1.712c-1.143-1.142.568-2.853 1.71-1.71L12 10.288l1.711-1.71c1.141-1.142 2.852.57 1.712 1.71L13.71 12l1.626 1.626c1.345 1.345-.76 2.663-1.626 1.797z" style="fill-rule:nonzero;stroke-width:1.20992"/></svg>'
};
function registerCustomIcons(editor) {
  for (const [name, svg] of Object.entries(icons)) {
    editor.ui.registry.addIcon(name, svg);
  }
}

// resources/js/wysiwyg-tinymce/filters.js
function setupBrFilter(editor) {
  editor.serializer.addNodeFilter("br", (nodes) => {
    for (const node of nodes) {
      if (node.parent && node.parent.name === "code") {
        const newline = window.tinymce.html.Node.create("#text");
        newline.value = "\n";
        node.replace(newline);
      }
    }
  });
}
function setupPointerFilter(editor) {
  editor.parser.addNodeFilter("div", (nodes) => {
    for (const node of nodes) {
      const id = node.attr("id") || "";
      const nodeClass = node.attr("class") || "";
      if (id === "pointer" || nodeClass.includes("pointer")) {
        node.remove();
      }
    }
  });
}
function setupFilters(editor) {
  setupBrFilter(editor);
  setupPointerFilter(editor);
}

// resources/js/wysiwyg-tinymce/plugin-codeeditor.js
function elemIsCodeBlock(elem2) {
  return elem2.tagName.toLowerCase() === "code-block";
}
function showPopup(editor, code, language, direction, callback) {
  const codeEditor = window.$components.first("code-editor");
  const bookMark = editor.selection.getBookmark();
  codeEditor.open(code, language, direction, (newCode, newLang) => {
    callback(newCode, newLang);
    editor.focus();
    editor.selection.moveToBookmark(bookMark);
  }, () => {
    editor.focus();
    editor.selection.moveToBookmark(bookMark);
  });
}
function showPopupForCodeBlock(editor, codeBlock) {
  const direction = codeBlock.getAttribute("dir") || "";
  showPopup(editor, codeBlock.getContent(), codeBlock.getLanguage(), direction, (newCode, newLang) => {
    codeBlock.setContent(newCode, newLang);
  });
}
function defineCodeBlockCustomElement(editor) {
  const doc = editor.getDoc();
  const win = doc.defaultView;
  class CodeBlockElement extends win.HTMLElement {
    constructor() {
      super();
      /**
       * @type {?SimpleEditorInterface}
       */
      __publicField(this, "editor", null);
      this.attachShadow({ mode: "open" });
      const stylesToCopy = document.head.querySelectorAll('link[rel="stylesheet"]:not([media="print"]),style');
      const copiedStyles = Array.from(stylesToCopy).map((styleEl) => styleEl.cloneNode(true));
      const cmContainer = document.createElement("div");
      cmContainer.style.pointerEvents = "none";
      cmContainer.contentEditable = "false";
      cmContainer.classList.add("CodeMirrorContainer");
      cmContainer.classList.toggle("dark-mode", document.documentElement.classList.contains("dark-mode"));
      this.shadowRoot.append(...copiedStyles, cmContainer);
    }
    getLanguage() {
      const getLanguageFromClassList = (classes) => {
        const langClasses = classes.split(" ").filter((cssClass) => cssClass.startsWith("language-"));
        return (langClasses[0] || "").replace("language-", "");
      };
      const code = this.querySelector("code");
      const pre = this.querySelector("pre");
      return getLanguageFromClassList(pre.className) || code && getLanguageFromClassList(code.className) || "";
    }
    setContent(content, language) {
      if (this.editor) {
        this.editor.setContent(content);
        this.editor.setMode(language, content);
      }
      let pre = this.querySelector("pre");
      if (!pre) {
        pre = doc.createElement("pre");
        this.append(pre);
      }
      pre.innerHTML = "";
      const code = doc.createElement("code");
      pre.append(code);
      code.innerText = content;
      code.className = `language-${language}`;
    }
    getContent() {
      const code = this.querySelector("code") || this.querySelector("pre");
      const tempEl = document.createElement("pre");
      tempEl.innerHTML = code.innerHTML.replace(/\ufeff/g, "");
      const brs = tempEl.querySelectorAll("br");
      for (const br of brs) {
        br.replaceWith("\n");
      }
      return tempEl.textContent;
    }
    connectedCallback() {
      const connectedTime = Date.now();
      if (this.editor) {
        return;
      }
      this.cleanChildContent();
      const content = this.getContent();
      const lines = content.split("\n").length;
      const height = lines * 19.2 + 18 + 24;
      this.style.height = `${height}px`;
      const container = this.shadowRoot.querySelector(".CodeMirrorContainer");
      const renderEditor = (Code2) => {
        this.editor = Code2.wysiwygView(container, this.shadowRoot, content, this.getLanguage());
        setTimeout(() => {
          this.style.height = null;
        }, 12);
      };
      window.importVersioned("code").then((Code2) => {
        const timeout = Date.now() - connectedTime < 20 ? 20 : 0;
        setTimeout(() => renderEditor(Code2), timeout);
      });
    }
    cleanChildContent() {
      const pre = this.querySelector("pre");
      if (!pre) return;
      for (const preChild of pre.childNodes) {
        if (preChild.nodeName === "#text" && preChild.textContent === "\uFEFF") {
          preChild.remove();
        }
      }
    }
  }
  win.customElements.define("code-block", CodeBlockElement);
}
function register2(editor) {
  editor.ui.registry.addIcon("codeblock", '<svg width="24" height="24"><path d="M4 3h16c.6 0 1 .4 1 1v16c0 .6-.4 1-1 1H4a1 1 0 0 1-1-1V4c0-.6.4-1 1-1Zm1 2v14h14V5Z"/><path d="M11.103 15.423c.277.277.277.738 0 .922a.692.692 0 0 1-1.106 0l-4.057-3.78a.738.738 0 0 1 0-1.107l4.057-3.872c.276-.277.83-.277 1.106 0a.724.724 0 0 1 0 1.014L7.6 12.012ZM12.897 8.577c-.245-.312-.2-.675.08-.955.28-.281.727-.27 1.027.033l4.057 3.78a.738.738 0 0 1 0 1.107l-4.057 3.872c-.277.277-.83.277-1.107 0a.724.724 0 0 1 0-1.014l3.504-3.412z"/></svg>');
  editor.ui.registry.addButton("codeeditor", {
    tooltip: "Insert code block",
    icon: "codeblock",
    onAction() {
      editor.execCommand("codeeditor");
    }
  });
  editor.ui.registry.addButton("editcodeeditor", {
    tooltip: "Edit code block",
    icon: "edit-block",
    onAction() {
      editor.execCommand("codeeditor");
    }
  });
  editor.addCommand("codeeditor", () => {
    const selectedNode = editor.selection.getNode();
    const doc = selectedNode.ownerDocument;
    if (elemIsCodeBlock(selectedNode)) {
      showPopupForCodeBlock(editor, selectedNode);
    } else {
      const textContent = editor.selection.getContent({ format: "text" });
      const direction = document.dir === "rtl" ? "ltr" : "";
      showPopup(editor, textContent, "", direction, (newCode, newLang) => {
        const pre = doc.createElement("pre");
        const code = doc.createElement("code");
        code.classList.add(`language-${newLang}`);
        code.innerText = newCode;
        if (direction) {
          pre.setAttribute("dir", direction);
        }
        pre.append(code);
        editor.insertContent(pre.outerHTML);
      });
    }
  });
  editor.on("dblclick", () => {
    const selectedNode = editor.selection.getNode();
    if (elemIsCodeBlock(selectedNode)) {
      showPopupForCodeBlock(editor, selectedNode);
    }
  });
  editor.on("PreInit", () => {
    editor.parser.addNodeFilter("pre", (elms) => {
      for (const el2 of elms) {
        const wrapper = window.tinymce.html.Node.create("code-block", {
          contenteditable: "false"
        });
        const childCodeBlock = el2.children().filter((child) => child.name === "code")[0] || null;
        const direction = el2.attr("dir") || childCodeBlock && childCodeBlock.attr("dir") || "";
        if (direction) {
          wrapper.attr("dir", direction);
        }
        const spans = el2.getAll("span");
        for (const span of spans) {
          span.unwrap();
        }
        el2.attr("style", null);
        el2.wrap(wrapper);
      }
    });
    editor.parser.addNodeFilter("code-block", (elms) => {
      for (const el2 of elms) {
        el2.attr("contenteditable", "false");
      }
    });
    editor.serializer.addNodeFilter("code-block", (elms) => {
      for (const el2 of elms) {
        const direction = el2.attr("dir");
        if (direction && el2.firstChild) {
          el2.firstChild.attr("dir", direction);
        } else if (el2.firstChild) {
          el2.firstChild.attr("dir", null);
        }
        el2.unwrap();
      }
    });
  });
  editor.ui.registry.addContextToolbar("codeeditor", {
    predicate(node) {
      return node.nodeName.toLowerCase() === "code-block";
    },
    items: "editcodeeditor",
    position: "node",
    scope: "node"
  });
  editor.on("PreInit", () => {
    defineCodeBlockCustomElement(editor);
  });
}
function getPlugin() {
  return register2;
}

// node_modules/idb-keyval/dist/index.js
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.oncomplete = request.onsuccess = () => resolve(request.result);
    request.onabort = request.onerror = () => reject(request.error);
  });
}
function createStore(dbName, storeName) {
  let dbp;
  const getDB = () => {
    if (dbp)
      return dbp;
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    dbp = promisifyRequest(request);
    dbp.then((db) => {
      db.onclose = () => dbp = void 0;
    }, () => {
    });
    return dbp;
  };
  return (txMode, callback) => getDB().then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
}
var defaultGetStoreFunc;
function defaultGetStore() {
  if (!defaultGetStoreFunc) {
    defaultGetStoreFunc = createStore("keyval-store", "keyval");
  }
  return defaultGetStoreFunc;
}
function get(key, customStore = defaultGetStore()) {
  return customStore("readonly", (store) => promisifyRequest(store.get(key)));
}
function set(key, value, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    store.put(value, key);
    return promisifyRequest(store.transaction);
  });
}
function del(key, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    store.delete(key);
    return promisifyRequest(store.transaction);
  });
}

// resources/js/services/drawio.ts
var iFrame = null;
var lastApprovedOrigin;
var onInit;
var onSave;
var saveBackupKey = "last-drawing-save";
function drawPostMessage(data) {
  iFrame?.contentWindow?.postMessage(JSON.stringify(data), lastApprovedOrigin);
}
function drawEventExport(message) {
  set(saveBackupKey, message.data);
  if (onSave) {
    onSave(message.data).then(() => {
      del(saveBackupKey);
    });
  }
}
function drawEventSave(message) {
  drawPostMessage({
    action: "export",
    format: "xmlpng",
    xml: message.xml,
    spin: "Updating drawing"
  });
}
function drawEventInit() {
  if (!onInit) return;
  onInit().then((xml) => {
    drawPostMessage({ action: "load", autosave: 1, xml });
  });
}
function drawEventConfigure() {
  const config = {};
  if (iFrame) {
    window.$events.emitPublic(iFrame, "editor-drawio::configure", { config });
    drawPostMessage({ action: "configure", config });
  }
}
function drawEventClose() {
  window.removeEventListener("message", drawReceive);
  if (iFrame) document.body.removeChild(iFrame);
}
function drawReceive(event) {
  if (!event.data || event.data.length < 1) return;
  if (event.origin !== lastApprovedOrigin) return;
  const message = JSON.parse(event.data);
  if (message.event === "init") {
    drawEventInit();
  } else if (message.event === "exit") {
    drawEventClose();
  } else if (message.event === "save") {
    drawEventSave(message);
  } else if (message.event === "export") {
    drawEventExport(message);
  } else if (message.event === "configure") {
    drawEventConfigure();
  }
}
async function attemptRestoreIfExists() {
  const backupVal = await get(saveBackupKey);
  const dialogEl = document.getElementById("unsaved-drawing-dialog");
  if (!dialogEl) {
    console.error("Missing expected unsaved-drawing dialog");
  }
  if (backupVal && dialogEl) {
    const dialog = window.$components.firstOnElement(dialogEl, "confirm-dialog");
    const restore = await dialog.show();
    if (restore) {
      onInit = async () => backupVal;
    }
  }
}
async function show(drawioUrl, onInitCallback, onSaveCallback) {
  onInit = onInitCallback;
  onSave = onSaveCallback;
  await attemptRestoreIfExists();
  iFrame = document.createElement("iframe");
  iFrame.setAttribute("frameborder", "0");
  window.addEventListener("message", drawReceive);
  iFrame.setAttribute("src", drawioUrl);
  iFrame.setAttribute("class", "fullscreen");
  iFrame.style.backgroundColor = "#FFFFFF";
  document.body.appendChild(iFrame);
  lastApprovedOrigin = new URL(drawioUrl).origin;
}
async function upload(imageData, pageUploadedToId) {
  const data = {
    image: imageData,
    uploaded_to: pageUploadedToId
  };
  const resp = await window.$http.post(window.baseUrl("/images/drawio"), data);
  return resp.data;
}
function close() {
  drawEventClose();
}
async function load(drawingId) {
  try {
    const resp = await window.$http.get(window.baseUrl(`/images/drawio/base64/${drawingId}`));
    const data = resp.data;
    return `data:image/png;base64,${data.content}`;
  } catch (error) {
    if (error instanceof HttpError) {
      window.$events.showResponseError(error);
    }
    close();
    throw error;
  }
}

// resources/js/wysiwyg-tinymce/plugin-drawio.js
var pageEditor = null;
var currentNode = null;
var options = {};
function isDrawing(node) {
  return node.hasAttribute("drawio-diagram");
}
function showDrawingManager(mceEditor, selectedNode = null) {
  pageEditor = mceEditor;
  currentNode = selectedNode;
  const imageManager = window.$components.first("image-manager");
  imageManager.show((image) => {
    if (selectedNode) {
      const imgElem = selectedNode.querySelector("img");
      pageEditor.undoManager.transact(() => {
        pageEditor.dom.setAttrib(imgElem, "src", image.url);
        pageEditor.dom.setAttrib(selectedNode, "drawio-diagram", image.id);
      });
    } else {
      const imgHTML = `<div drawio-diagram="${image.id}" contenteditable="false"><img src="${image.url}"></div>`;
      pageEditor.insertContent(imgHTML);
    }
  }, "drawio");
}
async function updateContent(pngData) {
  const loadingImage = window.baseUrl("/loading.gif");
  const handleUploadError = (error) => {
    if (error.status === 413) {
      window.$events.emit("error", options.translations.serverUploadLimitText);
    } else {
      window.$events.emit("error", options.translations.imageUploadErrorText);
    }
    console.error(error);
  };
  if (currentNode) {
    close();
    const imgElem = currentNode.querySelector("img");
    try {
      const img = await upload(pngData, options.pageId);
      pageEditor.undoManager.transact(() => {
        pageEditor.dom.setAttrib(imgElem, "src", img.url);
        pageEditor.dom.setAttrib(currentNode, "drawio-diagram", img.id);
      });
    } catch (err) {
      handleUploadError(err);
      throw new Error(`Failed to save image with error: ${err}`);
    }
    return;
  }
  await wait(5);
  const id = `drawing-${Math.random().toString(16).slice(2)}`;
  const wrapId = `drawing-wrap-${Math.random().toString(16).slice(2)}`;
  pageEditor.insertContent(`<div drawio-diagram contenteditable="false" id="${wrapId}"><img src="${loadingImage}" id="${id}"></div>`);
  close();
  try {
    const img = await upload(pngData, options.pageId);
    pageEditor.undoManager.transact(() => {
      pageEditor.dom.setAttrib(id, "src", img.url);
      pageEditor.dom.setAttrib(wrapId, "drawio-diagram", img.id);
    });
  } catch (err) {
    pageEditor.dom.remove(wrapId);
    handleUploadError(err);
    throw new Error(`Failed to save image with error: ${err}`);
  }
}
function drawingInit() {
  if (!currentNode) {
    return Promise.resolve("");
  }
  const drawingId = currentNode.getAttribute("drawio-diagram");
  return load(drawingId);
}
function showDrawingEditor(mceEditor, selectedNode = null) {
  pageEditor = mceEditor;
  currentNode = selectedNode;
  show(options.drawioUrl, drawingInit, updateContent);
}
function register3(editor) {
  editor.addCommand("drawio", () => {
    const selectedNode = editor.selection.getNode();
    showDrawingEditor(editor, isDrawing(selectedNode) ? selectedNode : null);
  });
  editor.ui.registry.addIcon("diagram", `<svg width="24" height="24" fill="${options.darkMode ? "#BBB" : "#000000"}" xmlns="http://www.w3.org/2000/svg"><path d="M20.716 7.639V2.845h-4.794v1.598h-7.99V2.845H3.138v4.794h1.598v7.99H3.138v4.794h4.794v-1.598h7.99v1.598h4.794v-4.794h-1.598v-7.99zM4.736 4.443h1.598V6.04H4.736zm1.598 14.382H4.736v-1.598h1.598zm9.588-1.598h-7.99v-1.598H6.334v-7.99h1.598V6.04h7.99v1.598h1.598v7.99h-1.598zm3.196 1.598H17.52v-1.598h1.598zM17.52 6.04V4.443h1.598V6.04zm-4.21 7.19h-2.79l-.582 1.599H8.643l2.717-7.191h1.119l2.724 7.19h-1.302zm-2.43-1.006h2.086l-1.039-3.06z"/></svg>`);
  editor.ui.registry.addSplitButton("drawio", {
    tooltip: "Insert/edit drawing",
    icon: "diagram",
    onAction() {
      editor.execCommand("drawio");
      window.document.body.dispatchEvent(new Event("mousedown", { bubbles: true }));
    },
    fetch(callback) {
      callback([
        {
          type: "choiceitem",
          text: "Drawing manager",
          value: "drawing-manager"
        }
      ]);
    },
    onItemAction(api, value) {
      if (value === "drawing-manager") {
        const selectedNode = editor.selection.getNode();
        showDrawingManager(editor, isDrawing(selectedNode) ? selectedNode : null);
      }
    }
  });
  editor.on("dblclick", () => {
    const selectedNode = editor.selection.getNode();
    if (!isDrawing(selectedNode)) return;
    showDrawingEditor(editor, selectedNode);
  });
  editor.on("SetContent", () => {
    const drawings = editor.dom.select("body > div[drawio-diagram]");
    if (!drawings.length) return;
    editor.undoManager.transact(() => {
      for (const drawing of drawings) {
        drawing.setAttribute("contenteditable", "false");
      }
    });
  });
}
function getPlugin2(providedOptions) {
  options = providedOptions;
  return register3;
}

// resources/js/wysiwyg-tinymce/plugins-customhr.js
function register4(editor) {
  editor.addCommand("InsertHorizontalRule", () => {
    const hrElem = document.createElement("hr");
    const cNode = editor.selection.getNode();
    const { parentNode } = cNode;
    parentNode.insertBefore(hrElem, cNode);
  });
  editor.ui.registry.addButton("customhr", {
    icon: "horizontal-rule",
    tooltip: "Insert horizontal line",
    onAction() {
      editor.execCommand("InsertHorizontalRule");
    }
  });
}
function getPlugin3() {
  return register4;
}

// resources/js/wysiwyg-tinymce/plugins-imagemanager.js
function register5(editor) {
  editor.ui.registry.addButton("imagemanager-insert", {
    title: "Insert image",
    icon: "image",
    tooltip: "Insert image",
    onAction() {
      const imageManager = window.$components.first("image-manager");
      imageManager.show((image) => {
        const imageUrl = image.thumbs?.display || image.url;
        let html = `<a href="${image.url}" target="_blank">`;
        html += `<img src="${imageUrl}" alt="${image.name}">`;
        html += "</a>";
        editor.execCommand("mceInsertContent", false, html);
      }, "gallery");
    }
  });
}
function getPlugin4() {
  return register5;
}

// resources/js/wysiwyg-tinymce/plugins-about.js
function register6(editor) {
  const aboutDialog = {
    title: "About the WYSIWYG Editor",
    url: window.baseUrl("/help/tinymce")
  };
  editor.ui.registry.addButton("about", {
    icon: "help",
    tooltip: "About the editor",
    onAction() {
      window.tinymce.activeEditor.windowManager.openUrl(aboutDialog);
    }
  });
}
function getPlugin5() {
  return register6;
}

// resources/js/wysiwyg-tinymce/util.js
var blockElementTypes = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "blockquote",
  "pre",
  "code-block",
  "details",
  "ul",
  "ol",
  "table",
  "hr"
];

// resources/js/wysiwyg-tinymce/plugins-details.js
function getSelectedDetailsBlock(editor) {
  return editor.selection.getNode().closest("details");
}
function setSummary(editor, summaryContent) {
  const details = getSelectedDetailsBlock(editor);
  if (!details) return;
  editor.undoManager.transact(() => {
    let summary = details.querySelector("summary");
    if (!summary) {
      summary = document.createElement("summary");
      details.prepend(summary);
    }
    summary.textContent = summaryContent;
  });
}
function detailsDialog(editor) {
  return {
    title: "Edit collapsible block",
    body: {
      type: "panel",
      items: [
        {
          type: "input",
          name: "summary",
          label: "Toggle label"
        }
      ]
    },
    buttons: [
      {
        type: "cancel",
        text: "Cancel"
      },
      {
        type: "submit",
        text: "Save",
        primary: true
      }
    ],
    onSubmit(api) {
      const { summary } = api.getData();
      setSummary(editor, summary);
      api.close();
    }
  };
}
function getSummaryTextFromDetails(element) {
  const summary = element.querySelector("summary");
  if (!summary) {
    return "";
  }
  return summary.textContent;
}
function showDetailLabelEditWindow(editor) {
  const details = getSelectedDetailsBlock(editor);
  const dialog = editor.windowManager.open(detailsDialog(editor));
  dialog.setData({ summary: getSummaryTextFromDetails(details) });
}
function unwrapDetailsInSelection(editor) {
  const details = editor.selection.getNode().closest("details");
  const selectionBm = editor.selection.getBookmark();
  if (details) {
    const elements = details.querySelectorAll("details > *:not(summary, doc-root), doc-root > *");
    editor.undoManager.transact(() => {
      for (const element of elements) {
        details.parentNode.insertBefore(element, details);
      }
      details.remove();
    });
  }
  editor.focus();
  editor.selection.moveToBookmark(selectionBm);
}
function unwrapDetailsEditable(detailsEl) {
  detailsEl.attr("contenteditable", null);
  let madeUnwrap = false;
  for (const child of detailsEl.children()) {
    if (child.name === "doc-root") {
      child.unwrap();
      madeUnwrap = true;
    }
  }
  if (madeUnwrap) {
    unwrapDetailsEditable(detailsEl);
  }
}
function ensureDetailsWrappedInEditable(detailsEl) {
  unwrapDetailsEditable(detailsEl);
  detailsEl.attr("contenteditable", "false");
  const rootWrap = window.tinymce.html.Node.create("doc-root", { contenteditable: "true" });
  let previousBlockWrap = null;
  for (const child of detailsEl.children()) {
    if (child.name === "summary") continue;
    const isBlock = blockElementTypes.includes(child.name);
    if (!isBlock) {
      if (!previousBlockWrap) {
        previousBlockWrap = window.tinymce.html.Node.create("p");
        rootWrap.append(previousBlockWrap);
      }
      previousBlockWrap.append(child);
    } else {
      rootWrap.append(child);
      previousBlockWrap = null;
    }
  }
  detailsEl.append(rootWrap);
}
function setupElementFilters(editor) {
  editor.parser.addNodeFilter("details", (elms) => {
    for (const el2 of elms) {
      ensureDetailsWrappedInEditable(el2);
    }
  });
  editor.serializer.addNodeFilter("details", (elms) => {
    for (const el2 of elms) {
      unwrapDetailsEditable(el2);
      el2.attr("open", null);
    }
  });
  editor.serializer.addNodeFilter("doc-root", (elms) => {
    for (const el2 of elms) {
      el2.unwrap();
    }
  });
}
function register7(editor) {
  editor.ui.registry.addIcon("details", '<svg width="24" height="24"><path d="M8.2 9a.5.5 0 0 0-.4.8l4 5.6a.5.5 0 0 0 .8 0l4-5.6a.5.5 0 0 0-.4-.8ZM20.122 18.151h-16c-.964 0-.934 2.7 0 2.7h16c1.139 0 1.173-2.7 0-2.7zM20.122 3.042h-16c-.964 0-.934 2.7 0 2.7h16c1.139 0 1.173-2.7 0-2.7z"/></svg>');
  editor.ui.registry.addIcon("togglefold", '<svg height="24"  width="24"><path d="M8.12 19.3c.39.39 1.02.39 1.41 0L12 16.83l2.47 2.47c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-3.17-3.17c-.39-.39-1.02-.39-1.41 0l-3.17 3.17c-.4.38-.4 1.02-.01 1.41zm7.76-14.6c-.39-.39-1.02-.39-1.41 0L12 7.17 9.53 4.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.03 0 1.42l3.17 3.17c.39.39 1.02.39 1.41 0l3.17-3.17c.4-.39.4-1.03.01-1.42z"/></svg>');
  editor.ui.registry.addIcon("togglelabel", '<svg height="18" width="18" viewBox="0 0 24 24"><path d="M21.41,11.41l-8.83-8.83C12.21,2.21,11.7,2,11.17,2H4C2.9,2,2,2.9,2,4v7.17c0,0.53,0.21,1.04,0.59,1.41l8.83,8.83 c0.78,0.78,2.05,0.78,2.83,0l7.17-7.17C22.2,13.46,22.2,12.2,21.41,11.41z M6.5,8C5.67,8,5,7.33,5,6.5S5.67,5,6.5,5S8,5.67,8,6.5 S7.33,8,6.5,8z"/></svg>');
  editor.ui.registry.addButton("details", {
    icon: "details",
    tooltip: "Insert collapsible block",
    onAction() {
      editor.execCommand("InsertDetailsBlock");
    }
  });
  editor.ui.registry.addButton("removedetails", {
    icon: "table-delete-table",
    tooltip: "Unwrap",
    onAction() {
      unwrapDetailsInSelection(editor);
    }
  });
  editor.ui.registry.addButton("editdetials", {
    icon: "togglelabel",
    tooltip: "Edit label",
    onAction() {
      showDetailLabelEditWindow(editor);
    }
  });
  editor.on("dblclick", (event) => {
    if (!getSelectedDetailsBlock(editor) || event.target.closest("doc-root")) return;
    showDetailLabelEditWindow(editor);
  });
  editor.ui.registry.addButton("toggledetails", {
    icon: "togglefold",
    tooltip: "Toggle open/closed",
    onAction() {
      const details = getSelectedDetailsBlock(editor);
      details.toggleAttribute("open");
      editor.focus();
    }
  });
  editor.addCommand("InsertDetailsBlock", () => {
    let content = editor.selection.getContent({ format: "html" });
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const id = `details-${Date.now()}`;
    details.setAttribute("data-id", id);
    details.appendChild(summary);
    if (!content) {
      content = "<p><br></p>";
    }
    details.innerHTML += content;
    editor.insertContent(details.outerHTML);
    editor.focus();
    const domDetails = editor.dom.select(`[data-id="${id}"]`)[0] || null;
    if (domDetails) {
      const firstChild = domDetails.querySelector("doc-root > *");
      if (firstChild) {
        firstChild.focus();
      }
      domDetails.removeAttribute("data-id");
    }
  });
  editor.ui.registry.addContextToolbar("details", {
    predicate(node) {
      return node.nodeName.toLowerCase() === "details";
    },
    items: "editdetials toggledetails removedetails",
    position: "node",
    scope: "node"
  });
  editor.on("PreInit", () => {
    setupElementFilters(editor);
  });
}
function getPlugin6() {
  return register7;
}

// resources/js/wysiwyg-tinymce/plugins-table-additions.js
function register8(editor) {
  editor.ui.registry.addIcon("tableclearformatting", '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 24 24"><path d="M15.53088 4.64727v-.82364c0-.453-.37063-.82363-.82363-.82363H4.82363C4.37063 3 4 3.37064 4 3.82363v3.29454c0 .453.37064.82364.82363.82364h9.88362c.453 0 .82363-.37064.82363-.82364v-.82363h.82364v3.29454H8.11817v7.4127c0 .453.37064.82364.82364.82364h1.64727c.453 0 .82363-.37064.82363-.82364v-5.76544h6.58907V4.64727Z"/><path d="m18.42672 19.51563-1.54687-1.54688-1.54688 1.54688c-.26751.2675-.70124.2675-.96875 0-.26751-.26752-.26751-.70124 0-.96876L15.9111 17l-1.54688-1.54688c-.26751-.2675-.26751-.70123 0-.96875.26751-.2675.70124-.2675.96875 0l1.54688 1.54688 1.54687-1.54688c.26751-.2675.70124-.2675.96875 0 .26751.26752.26751.70124 0 .96875L17.8486 17l1.54687 1.54688c.26751.2675.26751.70123 0 .96874-.26751.26752-.70124.26752-.96875 0z"/></svg>');
  const tableFirstRowContextSpec = {
    items: " | tablerowheader",
    predicate(elem2) {
      const isTable = elem2.nodeName.toLowerCase() === "table";
      const selectionNode = editor.selection.getNode();
      const parentTable = selectionNode.closest("table");
      if (!isTable || !parentTable) {
        return false;
      }
      const firstRow = parentTable.querySelector("tr");
      return firstRow.contains(selectionNode);
    },
    position: "node",
    scope: "node"
  };
  editor.ui.registry.addContextToolbar("customtabletoolbarfirstrow", tableFirstRowContextSpec);
  editor.addCommand("tableclearformatting", () => {
    const table = editor.dom.getParent(editor.selection.getStart(), "table");
    if (!table) {
      return;
    }
    const attrsToRemove = ["class", "style", "width", "height"];
    const styled = [table, ...table.querySelectorAll(attrsToRemove.map((a) => `[${a}]`).join(","))];
    for (const elem2 of styled) {
      for (const attr of attrsToRemove) {
        elem2.removeAttribute(attr);
      }
    }
  });
  editor.addCommand("tableclearsizes", () => {
    const table = editor.dom.getParent(editor.selection.getStart(), "table");
    if (!table) {
      return;
    }
    const targets = [table, ...table.querySelectorAll("tr,td,th,tbody,thead,tfoot,th>*,td>*")];
    for (const elem2 of targets) {
      elem2.removeAttribute("width");
      elem2.removeAttribute("height");
      elem2.style.height = null;
      elem2.style.width = null;
    }
  });
  const onPreInit = () => {
    const exitingButtons = editor.ui.registry.getAll().buttons;
    editor.ui.registry.addMenuButton("customtable", {
      ...exitingButtons.table,
      fetch: (callback) => callback("inserttable | cell row column | advtablesort | tableprops tableclearformatting tableclearsizes deletetable")
    });
    editor.ui.registry.addMenuItem("tableclearformatting", {
      icon: "tableclearformatting",
      text: "Clear table formatting",
      onSetup: exitingButtons.tableprops.onSetup,
      onAction() {
        editor.execCommand("tableclearformatting");
      }
    });
    editor.ui.registry.addMenuItem("tableclearsizes", {
      icon: "resize",
      text: "Resize to contents",
      onSetup: exitingButtons.tableprops.onSetup,
      onAction() {
        editor.execCommand("tableclearsizes");
      }
    });
    editor.off("PreInit", onPreInit);
  };
  editor.on("PreInit", onPreInit);
}
function getPlugin7() {
  return register8;
}

// resources/js/wysiwyg-tinymce/plugins-tasklist.js
function elementWithinTaskList(element) {
  const listEl = element.closest("li");
  return listEl && listEl.parentNode.nodeName === "UL" && listEl.classList.contains("task-list-item");
}
function handleTaskListItemClick(event, clickedEl, editor) {
  const bounds = clickedEl.getBoundingClientRect();
  const withinBounds = event.clientX <= bounds.right && event.clientX >= bounds.left && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!withinBounds) {
    editor.undoManager.transact(() => {
      if (clickedEl.hasAttribute("checked")) {
        clickedEl.removeAttribute("checked");
      } else {
        clickedEl.setAttribute("checked", "checked");
      }
    });
  }
}
function parseTaskListNode(node) {
  node.attr("class", "task-list-item");
  for (const child of node.children()) {
    if (child.name === "input") {
      if (child.attr("checked") === "checked") {
        node.attr("checked", "checked");
      }
      child.remove();
    }
  }
}
function serializeTaskListNode(node) {
  const isChecked = node.attr("checked") === "checked";
  node.attr("checked", null);
  const inputAttrs = { type: "checkbox", disabled: "disabled" };
  if (isChecked) {
    inputAttrs.checked = "checked";
  }
  const checkbox = window.tinymce.html.Node.create("input", inputAttrs);
  checkbox.shortEnded = true;
  if (node.firstChild) {
    node.insert(checkbox, node.firstChild, true);
  } else {
    node.append(checkbox);
  }
}
function register9(editor) {
  editor.ui.registry.addIcon("tasklist", '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M22,8c0-0.55-0.45-1-1-1h-7c-0.55,0-1,0.45-1,1s0.45,1,1,1h7C21.55,9,22,8.55,22,8z M13,16c0,0.55,0.45,1,1,1h7 c0.55,0,1-0.45,1-1c0-0.55-0.45-1-1-1h-7C13.45,15,13,15.45,13,16z M10.47,4.63c0.39,0.39,0.39,1.02,0,1.41l-4.23,4.25 c-0.39,0.39-1.02,0.39-1.42,0L2.7,8.16c-0.39-0.39-0.39-1.02,0-1.41c0.39-0.39,1.02-0.39,1.41,0l1.42,1.42l3.54-3.54 C9.45,4.25,10.09,4.25,10.47,4.63z M10.48,12.64c0.39,0.39,0.39,1.02,0,1.41l-4.23,4.25c-0.39,0.39-1.02,0.39-1.42,0L2.7,16.16 c-0.39-0.39-0.39-1.02,0-1.41s1.02-0.39,1.41,0l1.42,1.42l3.54-3.54C9.45,12.25,10.09,12.25,10.48,12.64L10.48,12.64z"/></svg>');
  editor.ui.registry.addToggleButton("tasklist", {
    tooltip: "Task list",
    icon: "tasklist",
    active: false,
    onAction(api) {
      if (api.isActive()) {
        editor.execCommand("RemoveList");
      } else {
        editor.execCommand("InsertUnorderedList", null, {
          "list-item-attributes": {
            class: "task-list-item"
          },
          "list-style-type": "tasklist"
        });
      }
    },
    onSetup(api) {
      editor.on("NodeChange", (event) => {
        const parentListEl = event.parents.find((el2) => el2.nodeName === "LI");
        const inList = parentListEl && parentListEl.classList.contains("task-list-item");
        api.setActive(Boolean(inList));
      });
    }
  });
  const existingBullListButton = editor.ui.registry.getAll().buttons.bullist;
  existingBullListButton.onSetup = function customBullListOnSetup(api) {
    editor.on("NodeChange", (event) => {
      const parentList = event.parents.find((el2) => el2.nodeName === "LI");
      const inTaskList = parentList && parentList.classList.contains("task-list-item");
      const inUlList = parentList && parentList.parentNode.nodeName === "UL";
      api.setActive(Boolean(inUlList && !inTaskList));
    });
  };
  existingBullListButton.onAction = function customBullListOnAction() {
    if (elementWithinTaskList(editor.selection.getNode())) {
      editor.execCommand("InsertOrderedList", null, {
        "list-item-attributes": { class: null }
      });
    }
    editor.execCommand("InsertUnorderedList", null, {
      "list-item-attributes": { class: null }
    });
  };
  const existingNumListButton = editor.ui.registry.getAll().buttons.numlist;
  existingNumListButton.onAction = function customNumListButtonOnAction() {
    editor.execCommand("InsertOrderedList", null, {
      "list-item-attributes": { class: null }
    });
  };
  editor.on("PreInit", () => {
    editor.parser.addNodeFilter("li", (nodes) => {
      for (const node of nodes) {
        if (node.attributes.map.class === "task-list-item") {
          parseTaskListNode(node);
        }
      }
    });
    editor.serializer.addNodeFilter("li", (nodes) => {
      for (const node of nodes) {
        if (node.attributes.map.class === "task-list-item") {
          serializeTaskListNode(node);
        }
      }
    });
  });
  editor.on("click", (event) => {
    const clickedEl = event.target;
    if (clickedEl.nodeName === "LI" && clickedEl.classList.contains("task-list-item")) {
      handleTaskListItemClick(event, clickedEl, editor);
      event.preventDefault();
    }
  });
}
function getPlugin8() {
  return register9;
}

// resources/js/wysiwyg-tinymce/fixes.js
function handleEmbedAlignmentChanges(editor) {
  function updateClassesForPreview(previewElem) {
    const mediaTarget = previewElem.querySelector("iframe, video");
    if (!mediaTarget) {
      return;
    }
    const alignmentClasses = [...mediaTarget.classList.values()].filter((c) => c.startsWith("align-"));
    const previewAlignClasses = [...previewElem.classList.values()].filter((c) => c.startsWith("align-"));
    previewElem.classList.remove(...previewAlignClasses);
    previewElem.classList.add(...alignmentClasses);
  }
  editor.on("SetContent", () => {
    const previewElems = editor.dom.select("span.mce-preview-object");
    for (const previewElem of previewElems) {
      updateClassesForPreview(previewElem);
    }
  });
  editor.on("FormatApply", (event) => {
    const isAlignment = event.format.startsWith("align");
    const isElement = event.node instanceof editor.dom.doc.defaultView.HTMLElement;
    if (!isElement || !isAlignment || !event.node.matches(".mce-preview-object")) {
      return;
    }
    const realTarget = event.node.querySelector("iframe, video");
    if (realTarget) {
      const className = (editor.formatter.get(event.format)[0]?.classes || [])[0];
      const toAdd = !realTarget.classList.contains(className);
      const wrapperClasses = (event.node.getAttribute("data-mce-p-class") || "").split(" ");
      const wrapperClassesFiltered = wrapperClasses.filter((c) => !c.startsWith("align-"));
      if (toAdd) {
        wrapperClassesFiltered.push(className);
      }
      const classesToApply = wrapperClassesFiltered.join(" ");
      event.node.setAttribute("data-mce-p-class", classesToApply);
      realTarget.setAttribute("class", classesToApply);
      editor.formatter.apply(event.format, {}, realTarget);
      updateClassesForPreview(event.node);
    }
  });
}
function cleanChildAlignment(element) {
  const alignedChildren = element.querySelectorAll('[align],[style*="text-align"],.align-center,.align-left,.align-right');
  for (const child of alignedChildren) {
    child.removeAttribute("align");
    child.style.textAlign = null;
    child.classList.remove("align-center", "align-right", "align-left");
  }
}
function cleanElementDirection(element) {
  const directionChildren = element.querySelectorAll('[dir],[style*="direction"]');
  for (const child of directionChildren) {
    child.removeAttribute("dir");
    child.style.direction = null;
  }
  cleanChildAlignment(element);
  element.style.direction = null;
  element.style.textAlign = null;
  element.removeAttribute("align");
}
function handleTableCellRangeEvents(editor) {
  let selectedCells = [];
  editor.on("TableSelectionChange", (event) => {
    selectedCells = (event.cells || []).map((cell) => cell.dom);
  });
  editor.on("TableSelectionClear", () => {
    selectedCells = [];
  });
  const actionByCommand = {
    // TinyMCE does not seem to do a great job on clearing styles in complex
    // scenarios (like copied word content) when a range of table cells
    // are selected. Here we watch for clear formatting events, so some manual
    // cleanup can be performed.
    RemoveFormat: (cell) => {
      const attrsToRemove = ["class", "style", "width", "height", "align"];
      for (const attr of attrsToRemove) {
        cell.removeAttribute(attr);
      }
    },
    // TinyMCE does not apply direction events to table cell range selections
    // so here we hastily patch in that ability by setting the direction ourselves
    // when a direction event is fired.
    mceDirectionLTR: (cell) => {
      cell.setAttribute("dir", "ltr");
      cleanElementDirection(cell);
    },
    mceDirectionRTL: (cell) => {
      cell.setAttribute("dir", "rtl");
      cleanElementDirection(cell);
    },
    // The "align" attribute can exist on table elements so this clears
    // the attribute, and also clears common child alignment properties,
    // when a text direction action is made for a table cell range.
    JustifyLeft: (cell) => {
      cell.removeAttribute("align");
      cleanChildAlignment(cell);
    }
  };
  actionByCommand.JustifyRight = actionByCommand.JustifyLeft;
  actionByCommand.JustifyCenter = actionByCommand.JustifyLeft;
  actionByCommand.JustifyFull = actionByCommand.JustifyLeft;
  editor.on("ExecCommand", (event) => {
    const action = actionByCommand[event.command];
    if (action) {
      for (const cell of selectedCells) {
        action(cell);
      }
    }
  });
}
function handleTextDirectionCleaning(editor) {
  editor.on("ExecCommand", (event) => {
    const command = event.command;
    if (command !== "mceDirectionLTR" && command !== "mceDirectionRTL") {
      return;
    }
    const blocks = editor.selection.getSelectedBlocks();
    for (const block of blocks) {
      cleanElementDirection(block);
    }
  });
}

// resources/js/wysiwyg-tinymce/config.js
var styleFormats = [
  { title: "Large Header", format: "h2", preview: "color: blue;" },
  { title: "Medium Header", format: "h3" },
  { title: "Small Header", format: "h4" },
  { title: "Tiny Header", format: "h5" },
  {
    title: "Paragraph",
    format: "p",
    exact: true,
    classes: ""
  },
  { title: "Blockquote", format: "blockquote" },
  {
    title: "Callouts",
    items: [
      { title: "Information", format: "calloutinfo" },
      { title: "Success", format: "calloutsuccess" },
      { title: "Warning", format: "calloutwarning" },
      { title: "Danger", format: "calloutdanger" }
    ]
  }
];
var formats = {
  alignleft: { selector: "p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img,iframe,video", classes: "align-left" },
  aligncenter: { selector: "p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img,iframe,video", classes: "align-center" },
  alignright: { selector: "p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img,iframe,video", classes: "align-right" },
  calloutsuccess: { block: "p", exact: true, attributes: { class: "callout success" } },
  calloutinfo: { block: "p", exact: true, attributes: { class: "callout info" } },
  calloutwarning: { block: "p", exact: true, attributes: { class: "callout warning" } },
  calloutdanger: { block: "p", exact: true, attributes: { class: "callout danger" } }
};
var colorMap = [
  "#BFEDD2",
  "",
  "#FBEEB8",
  "",
  "#F8CAC6",
  "",
  "#ECCAFA",
  "",
  "#C2E0F4",
  "",
  "#2DC26B",
  "",
  "#F1C40F",
  "",
  "#E03E2D",
  "",
  "#B96AD9",
  "",
  "#3598DB",
  "",
  "#169179",
  "",
  "#E67E23",
  "",
  "#BA372A",
  "",
  "#843FA1",
  "",
  "#236FA1",
  "",
  "#ECF0F1",
  "",
  "#CED4D9",
  "",
  "#95A5A6",
  "",
  "#7E8C8D",
  "",
  "#34495E",
  "",
  "#000000",
  "",
  "#ffffff",
  ""
];
function filePickerCallback(callback, value, meta) {
  if (meta.filetype === "file") {
    const selector = window.$components.first("entity-selector-popup");
    const selectionText = this.selection.getContent({ format: "text" }).trim();
    selector.show((entity) => {
      callback(entity.link, {
        text: entity.name,
        title: entity.name
      });
    }, {
      initialValue: selectionText,
      searchEndpoint: "/search/entity-selector",
      entityTypes: "page,book,chapter,bookshelf",
      entityPermission: "view"
    });
  }
  if (meta.filetype === "image") {
    const imageManager = window.$components.first("image-manager");
    imageManager.show((image) => {
      callback(image.url, { alt: image.name });
    }, "gallery");
  }
}
function gatherPlugins(options2) {
  const plugins2 = [
    "image",
    "table",
    "link",
    "autolink",
    "fullscreen",
    "code",
    "customhr",
    "autosave",
    "lists",
    "codeeditor",
    "media",
    "imagemanager",
    "about",
    "details",
    "tasklist",
    "tableadditions",
    options2.textDirection === "rtl" ? "directionality" : ""
  ];
  window.tinymce.PluginManager.add("codeeditor", getPlugin());
  window.tinymce.PluginManager.add("customhr", getPlugin3());
  window.tinymce.PluginManager.add("imagemanager", getPlugin4());
  window.tinymce.PluginManager.add("about", getPlugin5());
  window.tinymce.PluginManager.add("details", getPlugin6());
  window.tinymce.PluginManager.add("tasklist", getPlugin8());
  window.tinymce.PluginManager.add("tableadditions", getPlugin7());
  if (options2.drawioUrl) {
    window.tinymce.PluginManager.add("drawio", getPlugin2(options2));
    plugins2.push("drawio");
  }
  return plugins2.filter((plugin) => Boolean(plugin));
}
function addCustomHeadContent(editorDoc) {
  const headContentLines = document.head.innerHTML.split("\n");
  const startLineIndex = headContentLines.findIndex((line) => line.trim() === "<!-- Start: custom user content -->");
  const endLineIndex = headContentLines.findIndex((line) => line.trim() === "<!-- End: custom user content -->");
  if (startLineIndex === -1 || endLineIndex === -1) {
    return;
  }
  const customHeadHtml = headContentLines.slice(startLineIndex + 1, endLineIndex).join("\n");
  const el2 = editorDoc.createElement("div");
  el2.innerHTML = customHeadHtml;
  editorDoc.head.append(...el2.children);
}
function getSetupCallback(options2) {
  return function setupCallback(editor) {
    function editorChange() {
      if (options2.darkMode) {
        editor.contentDocument.documentElement.classList.add("dark-mode");
      }
      window.$events.emit("editor-html-change", "");
    }
    editor.on("ExecCommand change input NodeChange ObjectResized", editorChange);
    listen(editor);
    listenForDragAndPaste(editor, options2);
    editor.on("init", () => {
      editorChange();
      scrollToQueryString(editor);
      window.editor = editor;
      register(editor);
    });
    editor.on("PreInit", () => {
      setupFilters(editor);
    });
    handleEmbedAlignmentChanges(editor);
    handleTableCellRangeEvents(editor);
    handleTextDirectionCleaning(editor);
    window.$events.emitPublic(options2.containerElement, "editor-tinymce::setup", { editor });
    editor.ui.registry.addButton("inlinecode", {
      tooltip: "Inline code",
      icon: "sourcecode",
      onAction() {
        editor.execCommand("mceToggleFormat", false, "code");
      }
    });
  };
}
function getContentStyle(options2) {
  return `
html, body, html.dark-mode {
    background: ${options2.darkMode ? "#222" : "#fff"};
} 
body {
    padding-left: 15px !important;
    padding-right: 15px !important; 
    height: initial !important;
    margin:0!important; 
    margin-left: auto! important;
    margin-right: auto !important;
    overflow-y: hidden !important;
}`.trim().replace("\n", "");
}
function buildForEditor(options2) {
  window.tinymce.addI18n(options2.language, options2.translationMap);
  const version2 = document.querySelector('script[src*="/dist/app.js"]').getAttribute("src").split("?version=")[1];
  return {
    width: "100%",
    height: "100%",
    selector: "#html-editor",
    cache_suffix: `?version=${version2}`,
    content_css: [
      window.baseUrl("/dist/styles.css")
    ],
    branding: false,
    skin: options2.darkMode ? "tinymce-5-dark" : "tinymce-5",
    body_class: "page-content",
    browser_spellcheck: true,
    relative_urls: false,
    language: options2.language,
    directionality: options2.textDirection,
    remove_script_host: false,
    document_base_url: window.baseUrl("/"),
    end_container_on_empty_block: true,
    remove_trailing_brs: false,
    statusbar: false,
    menubar: false,
    paste_data_images: false,
    extended_valid_elements: "pre[*],svg[*],div[drawio-diagram],details[*],summary[*],div[*],li[class|checked|style]",
    automatic_uploads: false,
    custom_elements: "doc-root,code-block",
    valid_children: [
      "-div[p|h1|h2|h3|h4|h5|h6|blockquote|code-block]",
      "+div[pre|img]",
      "-doc-root[doc-root|#text]",
      "-li[details]",
      "+code-block[pre]",
      "+doc-root[p|h1|h2|h3|h4|h5|h6|blockquote|code-block|div|hr]"
    ].join(","),
    plugins: gatherPlugins(options2),
    contextmenu: false,
    toolbar: getPrimaryToolbar(options2),
    content_style: getContentStyle(options2),
    style_formats: styleFormats,
    style_formats_merge: false,
    media_alt_source: false,
    media_poster: false,
    formats,
    table_style_by_css: true,
    table_use_colgroups: true,
    file_picker_types: "file image",
    color_map: colorMap,
    file_picker_callback: filePickerCallback,
    paste_preprocess(plugin, args) {
      const { content } = args;
      if (content.indexOf('<img src="file://') !== -1) {
        args.content = "";
      }
    },
    init_instance_callback(editor) {
      addCustomHeadContent(editor.getDoc());
    },
    setup(editor) {
      registerCustomIcons(editor);
      registerAdditionalToolbars(editor);
      getSetupCallback(options2)(editor);
    }
  };
}

// resources/js/components/wysiwyg-editor-tinymce.js
var WysiwygEditorTinymce = class extends Component {
  setup() {
    this.elem = this.$el;
    this.tinyMceConfig = buildForEditor({
      language: this.$opts.language,
      containerElement: this.elem,
      darkMode: document.documentElement.classList.contains("dark-mode"),
      textDirection: this.$opts.textDirection,
      drawioUrl: this.getDrawIoUrl(),
      pageId: Number(this.$opts.pageId),
      translations: {
        imageUploadErrorText: this.$opts.imageUploadErrorText,
        serverUploadLimitText: this.$opts.serverUploadLimitText
      },
      translationMap: window.editor_translations
    });
    window.$events.emitPublic(this.elem, "editor-tinymce::pre-init", { config: this.tinyMceConfig });
    window.tinymce.init({ ...this.tinyMceConfig, content_css: "dist/styles.css" }).then((editors) => {
      this.editor = editors[0];
    });
  }
  getDrawIoUrl() {
    const drawioUrlElem = document.querySelector("[drawio-url]");
    if (drawioUrlElem) {
      return drawioUrlElem.getAttribute("drawio-url");
    }
    return "";
  }
  /**
   * Get the content of this editor.
   * Used by the parent page editor component.
   * @return {Promise<{html: String}>}
   */
  async getContent() {
    return {
      html: this.editor.getContent()
    };
  }
};

// resources/js/components/wysiwyg-input.ts
var WysiwygInput = class extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "elem");
    __publicField(this, "wysiwygEditor");
    __publicField(this, "textDirection");
  }
  async setup() {
    this.elem = this.$el;
    this.textDirection = this.$opts.textDirection;
    const wysiwygModule = await window.importVersioned("wysiwyg");
    const container = el("div", { class: "basic-editor-container" });
    this.elem.parentElement?.appendChild(container);
    this.elem.hidden = true;
    this.wysiwygEditor = wysiwygModule.createBasicEditorInstance(container, this.elem.value, {
      darkMode: document.documentElement.classList.contains("dark-mode"),
      textDirection: this.textDirection,
      translations: window.editor_translations
    });
    this.wysiwygEditor.onChange(() => {
      this.wysiwygEditor.getContentAsHtml().then((html) => {
        this.elem.value = html;
      });
    });
  }
};

// resources/js/services/text.ts
function kebabToCamel(kebab) {
  const ucFirst = (word) => word.slice(0, 1).toUpperCase() + word.slice(1);
  const words = kebab.split("-");
  return words[0] + words.slice(1).map(ucFirst).join("");
}
function camelToKebab(camelStr) {
  return camelStr.replace(/[A-Z]/g, (str, offset) => (offset > 0 ? "-" : "") + str.toLowerCase());
}

// resources/js/services/components.ts
function parseRefs(name, element) {
  const refs = {};
  const manyRefs = {};
  const prefix = `${name}@`;
  const selector = `[refs*="${prefix}"]`;
  const refElems = [...element.querySelectorAll(selector)];
  if (element.matches(selector)) {
    refElems.push(element);
  }
  for (const el2 of refElems) {
    const refNames = (el2.getAttribute("refs") || "").split(" ").filter((str) => str.startsWith(prefix)).map((str) => str.replace(prefix, "")).map(kebabToCamel);
    for (const ref of refNames) {
      refs[ref] = el2;
      if (typeof manyRefs[ref] === "undefined") {
        manyRefs[ref] = [];
      }
      manyRefs[ref].push(el2);
    }
  }
  return { refs, manyRefs };
}
function parseOpts(componentName, element) {
  const opts = {};
  const prefix = `option:${componentName}:`;
  for (const { name, value } of element.attributes) {
    if (name.startsWith(prefix)) {
      const optName = name.replace(prefix, "");
      opts[kebabToCamel(optName)] = value || "";
    }
  }
  return opts;
}
var ComponentStore = class {
  constructor() {
    /**
     * A mapping of active components keyed by name, with values being arrays of component
     * instances since there can be multiple components of the same type.
     */
    __publicField(this, "components", {});
    /**
     * A mapping of component class models, keyed by name.
     */
    __publicField(this, "componentModelMap", {});
    /**
     * A mapping of active component maps, keyed by the element components are assigned to.
     */
    __publicField(this, "elementComponentMap", /* @__PURE__ */ new WeakMap());
  }
  /**
   * Initialize a component instance on the given dom element.
   */
  initComponent(name, element) {
    const ComponentModel = this.componentModelMap[name];
    if (ComponentModel === void 0) return;
    let instance = null;
    try {
      instance = new ComponentModel();
      instance.$name = name;
      instance.$el = element;
      const allRefs = parseRefs(name, element);
      instance.$refs = allRefs.refs;
      instance.$manyRefs = allRefs.manyRefs;
      instance.$opts = parseOpts(name, element);
      instance.setup();
    } catch (e) {
      console.error("Failed to create component", e, name, element);
    }
    if (!instance) {
      return;
    }
    if (typeof this.components[name] === "undefined") {
      this.components[name] = [];
    }
    this.components[name].push(instance);
    const elComponents = this.elementComponentMap.get(element) || {};
    elComponents[name] = instance;
    this.elementComponentMap.set(element, elComponents);
  }
  /**
   * Initialize all components found within the given element.
   */
  init(parentElement = document) {
    const componentElems = parentElement.querySelectorAll("[component],[components]");
    for (const el2 of componentElems) {
      const componentNames = `${el2.getAttribute("component") || ""} ${el2.getAttribute("components")}`.toLowerCase().split(" ").filter(Boolean);
      for (const name of componentNames) {
        this.initComponent(name, el2);
      }
    }
  }
  /**
   * Register the given component mapping into the component system.
   * @param {Object<String, ObjectConstructor<Component>>} mapping
   */
  register(mapping) {
    const keys = Object.keys(mapping);
    for (const key of keys) {
      this.componentModelMap[camelToKebab(key)] = mapping[key];
    }
  }
  /**
   * Get the first component of the given name.
   */
  first(name) {
    return (this.components[name] || [null])[0];
  }
  /**
   * Get all the components of the given name.
   */
  get(name) {
    return this.components[name] || [];
  }
  /**
   * Get the first component, of the given name, that's assigned to the given element.
   */
  firstOnElement(element, name) {
    const elComponents = this.elementComponentMap.get(element) || {};
    return elComponents[name] || null;
  }
  allWithinElement(element, name) {
    const components = this.get(name);
    return components.filter((c) => element.contains(c.$el));
  }
};

// node_modules/lucide/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};

// node_modules/lucide/dist/esm/createElement.js
var createSVGElement = ([tag, attrs, children]) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach((name) => {
    element.setAttribute(name, String(attrs[name]));
  });
  if (children?.length) {
    children.forEach((child) => {
      const childElement = createSVGElement(child);
      element.appendChild(childElement);
    });
  }
  return element;
};
var createElement = (iconNode, customAttrs = {}) => {
  const tag = "svg";
  const attrs = {
    ...defaultAttributes,
    ...customAttrs
  };
  return createSVGElement([tag, attrs, iconNode]);
};

// node_modules/lucide/dist/esm/replaceElement.js
var getAttrs = (element) => Array.from(element.attributes).reduce((attrs, attr) => {
  attrs[attr.name] = attr.value;
  return attrs;
}, {});
var getClassNames = (attrs) => {
  if (typeof attrs === "string") return attrs;
  if (!attrs || !attrs.class) return "";
  if (attrs.class && typeof attrs.class === "string") {
    return attrs.class.split(" ");
  }
  if (attrs.class && Array.isArray(attrs.class)) {
    return attrs.class;
  }
  return "";
};
var combineClassNames = (arrayOfClassnames) => {
  const classNameArray = arrayOfClassnames.flatMap(getClassNames);
  return classNameArray.map((classItem) => classItem.trim()).filter(Boolean).filter((value, index2, self) => self.indexOf(value) === index2).join(" ");
};
var toPascalCase = (string) => string.replace(/(\w)(\w*)(_|-|\s*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
var replaceElement = (element, { nameAttr, icons: icons2, attrs }) => {
  const iconName = element.getAttribute(nameAttr);
  if (iconName == null) return;
  const ComponentName = toPascalCase(iconName);
  const iconNode = icons2[ComponentName];
  if (!iconNode) {
    return console.warn(
      `${element.outerHTML} icon name was not found in the provided icons object.`
    );
  }
  const elementAttrs = getAttrs(element);
  const iconAttrs = {
    ...defaultAttributes,
    "data-lucide": iconName,
    ...attrs,
    ...elementAttrs
  };
  const classNames = combineClassNames(["lucide", `lucide-${iconName}`, elementAttrs, attrs]);
  if (classNames) {
    Object.assign(iconAttrs, {
      class: classNames
    });
  }
  const svgElement = createElement(iconNode, iconAttrs);
  return element.parentNode?.replaceChild(svgElement, element);
};

// node_modules/lucide/dist/esm/iconsAndAliases.js
var iconsAndAliases_exports = {};
__export(iconsAndAliases_exports, {
  AArrowDown: () => AArrowDown,
  AArrowUp: () => AArrowUp,
  ALargeSmall: () => ALargeSmall,
  Accessibility: () => Accessibility,
  Activity: () => Activity,
  ActivitySquare: () => SquareActivity,
  AirVent: () => AirVent,
  Airplay: () => Airplay,
  AlarmCheck: () => AlarmClockCheck,
  AlarmClock: () => AlarmClock,
  AlarmClockCheck: () => AlarmClockCheck,
  AlarmClockMinus: () => AlarmClockMinus,
  AlarmClockOff: () => AlarmClockOff,
  AlarmClockPlus: () => AlarmClockPlus,
  AlarmMinus: () => AlarmClockMinus,
  AlarmPlus: () => AlarmClockPlus,
  AlarmSmoke: () => AlarmSmoke,
  Album: () => Album,
  AlertCircle: () => CircleAlert,
  AlertOctagon: () => OctagonAlert,
  AlertTriangle: () => TriangleAlert,
  AlignCenter: () => TextAlignCenter,
  AlignCenterHorizontal: () => AlignCenterHorizontal,
  AlignCenterVertical: () => AlignCenterVertical,
  AlignEndHorizontal: () => AlignEndHorizontal,
  AlignEndVertical: () => AlignEndVertical,
  AlignHorizontalDistributeCenter: () => AlignHorizontalDistributeCenter,
  AlignHorizontalDistributeEnd: () => AlignHorizontalDistributeEnd,
  AlignHorizontalDistributeStart: () => AlignHorizontalDistributeStart,
  AlignHorizontalJustifyCenter: () => AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd: () => AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart: () => AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround: () => AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween: () => AlignHorizontalSpaceBetween,
  AlignJustify: () => TextAlignJustify,
  AlignLeft: () => TextAlignStart,
  AlignRight: () => TextAlignEnd,
  AlignStartHorizontal: () => AlignStartHorizontal,
  AlignStartVertical: () => AlignStartVertical,
  AlignVerticalDistributeCenter: () => AlignVerticalDistributeCenter,
  AlignVerticalDistributeEnd: () => AlignVerticalDistributeEnd,
  AlignVerticalDistributeStart: () => AlignVerticalDistributeStart,
  AlignVerticalJustifyCenter: () => AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd: () => AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart: () => AlignVerticalJustifyStart,
  AlignVerticalSpaceAround: () => AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween: () => AlignVerticalSpaceBetween,
  Ambulance: () => Ambulance,
  Ampersand: () => Ampersand,
  Ampersands: () => Ampersands,
  Amphora: () => Amphora,
  Anchor: () => Anchor,
  Angry: () => Angry,
  Annoyed: () => Annoyed,
  Antenna: () => Antenna,
  Anvil: () => Anvil,
  Aperture: () => Aperture,
  AppWindow: () => AppWindow,
  AppWindowMac: () => AppWindowMac,
  Apple: () => Apple,
  Archive: () => Archive,
  ArchiveRestore: () => ArchiveRestore,
  ArchiveX: () => ArchiveX,
  AreaChart: () => ChartArea,
  Armchair: () => Armchair,
  ArrowBigDown: () => ArrowBigDown,
  ArrowBigDownDash: () => ArrowBigDownDash,
  ArrowBigLeft: () => ArrowBigLeft,
  ArrowBigLeftDash: () => ArrowBigLeftDash,
  ArrowBigRight: () => ArrowBigRight,
  ArrowBigRightDash: () => ArrowBigRightDash,
  ArrowBigUp: () => ArrowBigUp,
  ArrowBigUpDash: () => ArrowBigUpDash,
  ArrowDown: () => ArrowDown,
  ArrowDown01: () => ArrowDown01,
  ArrowDown10: () => ArrowDown10,
  ArrowDownAZ: () => ArrowDownAZ,
  ArrowDownAz: () => ArrowDownAZ,
  ArrowDownCircle: () => CircleArrowDown,
  ArrowDownFromLine: () => ArrowDownFromLine,
  ArrowDownLeft: () => ArrowDownLeft,
  ArrowDownLeftFromCircle: () => CircleArrowOutDownLeft,
  ArrowDownLeftFromSquare: () => SquareArrowOutDownLeft,
  ArrowDownLeftSquare: () => SquareArrowDownLeft,
  ArrowDownNarrowWide: () => ArrowDownNarrowWide,
  ArrowDownRight: () => ArrowDownRight,
  ArrowDownRightFromCircle: () => CircleArrowOutDownRight,
  ArrowDownRightFromSquare: () => SquareArrowOutDownRight,
  ArrowDownRightSquare: () => SquareArrowDownRight,
  ArrowDownSquare: () => SquareArrowDown,
  ArrowDownToDot: () => ArrowDownToDot,
  ArrowDownToLine: () => ArrowDownToLine,
  ArrowDownUp: () => ArrowDownUp,
  ArrowDownWideNarrow: () => ArrowDownWideNarrow,
  ArrowDownZA: () => ArrowDownZA,
  ArrowDownZa: () => ArrowDownZA,
  ArrowLeft: () => ArrowLeft,
  ArrowLeftCircle: () => CircleArrowLeft,
  ArrowLeftFromLine: () => ArrowLeftFromLine,
  ArrowLeftRight: () => ArrowLeftRight,
  ArrowLeftSquare: () => SquareArrowLeft,
  ArrowLeftToLine: () => ArrowLeftToLine,
  ArrowRight: () => ArrowRight,
  ArrowRightCircle: () => CircleArrowRight,
  ArrowRightFromLine: () => ArrowRightFromLine,
  ArrowRightLeft: () => ArrowRightLeft,
  ArrowRightSquare: () => SquareArrowRight,
  ArrowRightToLine: () => ArrowRightToLine,
  ArrowUp: () => ArrowUp,
  ArrowUp01: () => ArrowUp01,
  ArrowUp10: () => ArrowUp10,
  ArrowUpAZ: () => ArrowUpAZ,
  ArrowUpAz: () => ArrowUpAZ,
  ArrowUpCircle: () => CircleArrowUp,
  ArrowUpDown: () => ArrowUpDown,
  ArrowUpFromDot: () => ArrowUpFromDot,
  ArrowUpFromLine: () => ArrowUpFromLine,
  ArrowUpLeft: () => ArrowUpLeft,
  ArrowUpLeftFromCircle: () => CircleArrowOutUpLeft,
  ArrowUpLeftFromSquare: () => SquareArrowOutUpLeft,
  ArrowUpLeftSquare: () => SquareArrowUpLeft,
  ArrowUpNarrowWide: () => ArrowUpNarrowWide,
  ArrowUpRight: () => ArrowUpRight,
  ArrowUpRightFromCircle: () => CircleArrowOutUpRight,
  ArrowUpRightFromSquare: () => SquareArrowOutUpRight,
  ArrowUpRightSquare: () => SquareArrowUpRight,
  ArrowUpSquare: () => SquareArrowUp,
  ArrowUpToLine: () => ArrowUpToLine,
  ArrowUpWideNarrow: () => ArrowUpWideNarrow,
  ArrowUpZA: () => ArrowUpZA,
  ArrowUpZa: () => ArrowUpZA,
  ArrowsUpFromLine: () => ArrowsUpFromLine,
  Asterisk: () => Asterisk,
  AsteriskSquare: () => SquareAsterisk,
  AtSign: () => AtSign,
  Atom: () => Atom,
  AudioLines: () => AudioLines,
  AudioWaveform: () => AudioWaveform,
  Award: () => Award,
  Axe: () => Axe,
  Axis3D: () => Axis3d,
  Axis3d: () => Axis3d,
  Baby: () => Baby,
  Backpack: () => Backpack,
  Badge: () => Badge,
  BadgeAlert: () => BadgeAlert,
  BadgeCent: () => BadgeCent,
  BadgeCheck: () => BadgeCheck,
  BadgeDollarSign: () => BadgeDollarSign,
  BadgeEuro: () => BadgeEuro,
  BadgeHelp: () => BadgeQuestionMark,
  BadgeIndianRupee: () => BadgeIndianRupee,
  BadgeInfo: () => BadgeInfo,
  BadgeJapaneseYen: () => BadgeJapaneseYen,
  BadgeMinus: () => BadgeMinus,
  BadgePercent: () => BadgePercent,
  BadgePlus: () => BadgePlus,
  BadgePoundSterling: () => BadgePoundSterling,
  BadgeQuestionMark: () => BadgeQuestionMark,
  BadgeRussianRuble: () => BadgeRussianRuble,
  BadgeSwissFranc: () => BadgeSwissFranc,
  BadgeTurkishLira: () => BadgeTurkishLira,
  BadgeX: () => BadgeX,
  BaggageClaim: () => BaggageClaim,
  Ban: () => Ban,
  Banana: () => Banana,
  Bandage: () => Bandage,
  Banknote: () => Banknote,
  BanknoteArrowDown: () => BanknoteArrowDown,
  BanknoteArrowUp: () => BanknoteArrowUp,
  BanknoteX: () => BanknoteX,
  BarChart: () => ChartNoAxesColumnIncreasing,
  BarChart2: () => ChartNoAxesColumn,
  BarChart3: () => ChartColumn,
  BarChart4: () => ChartColumnIncreasing,
  BarChartBig: () => ChartColumnBig,
  BarChartHorizontal: () => ChartBar,
  BarChartHorizontalBig: () => ChartBarBig,
  Barcode: () => Barcode,
  Barrel: () => Barrel,
  Baseline: () => Baseline,
  Bath: () => Bath,
  Battery: () => Battery,
  BatteryCharging: () => BatteryCharging,
  BatteryFull: () => BatteryFull,
  BatteryLow: () => BatteryLow,
  BatteryMedium: () => BatteryMedium,
  BatteryPlus: () => BatteryPlus,
  BatteryWarning: () => BatteryWarning,
  Beaker: () => Beaker,
  Bean: () => Bean,
  BeanOff: () => BeanOff,
  Bed: () => Bed,
  BedDouble: () => BedDouble,
  BedSingle: () => BedSingle,
  Beef: () => Beef,
  Beer: () => Beer,
  BeerOff: () => BeerOff,
  Bell: () => Bell,
  BellDot: () => BellDot,
  BellElectric: () => BellElectric,
  BellMinus: () => BellMinus,
  BellOff: () => BellOff,
  BellPlus: () => BellPlus,
  BellRing: () => BellRing,
  BetweenHorizonalEnd: () => BetweenHorizontalEnd,
  BetweenHorizonalStart: () => BetweenHorizontalStart,
  BetweenHorizontalEnd: () => BetweenHorizontalEnd,
  BetweenHorizontalStart: () => BetweenHorizontalStart,
  BetweenVerticalEnd: () => BetweenVerticalEnd,
  BetweenVerticalStart: () => BetweenVerticalStart,
  BicepsFlexed: () => BicepsFlexed,
  Bike: () => Bike,
  Binary: () => Binary,
  Binoculars: () => Binoculars,
  Biohazard: () => Biohazard,
  Bird: () => Bird,
  Birdhouse: () => Birdhouse,
  Bitcoin: () => Bitcoin,
  Blend: () => Blend,
  Blinds: () => Blinds,
  Blocks: () => Blocks,
  Bluetooth: () => Bluetooth,
  BluetoothConnected: () => BluetoothConnected,
  BluetoothOff: () => BluetoothOff,
  BluetoothSearching: () => BluetoothSearching,
  Bold: () => Bold,
  Bolt: () => Bolt,
  Bomb: () => Bomb,
  Bone: () => Bone,
  Book: () => Book,
  BookA: () => BookA,
  BookAlert: () => BookAlert,
  BookAudio: () => BookAudio,
  BookCheck: () => BookCheck,
  BookCopy: () => BookCopy,
  BookDashed: () => BookDashed,
  BookDown: () => BookDown,
  BookHeadphones: () => BookHeadphones,
  BookHeart: () => BookHeart,
  BookImage: () => BookImage,
  BookKey: () => BookKey,
  BookLock: () => BookLock,
  BookMarked: () => BookMarked,
  BookMinus: () => BookMinus,
  BookOpen: () => BookOpen,
  BookOpenCheck: () => BookOpenCheck,
  BookOpenText: () => BookOpenText,
  BookPlus: () => BookPlus,
  BookTemplate: () => BookDashed,
  BookText: () => BookText,
  BookType: () => BookType,
  BookUp: () => BookUp,
  BookUp2: () => BookUp2,
  BookUser: () => BookUser,
  BookX: () => BookX,
  Bookmark: () => Bookmark,
  BookmarkCheck: () => BookmarkCheck,
  BookmarkMinus: () => BookmarkMinus,
  BookmarkPlus: () => BookmarkPlus,
  BookmarkX: () => BookmarkX,
  BoomBox: () => BoomBox,
  Bot: () => Bot,
  BotMessageSquare: () => BotMessageSquare,
  BotOff: () => BotOff,
  BottleWine: () => BottleWine,
  BowArrow: () => BowArrow,
  Box: () => Box,
  BoxSelect: () => SquareDashed,
  Boxes: () => Boxes,
  Braces: () => Braces,
  Brackets: () => Brackets,
  Brain: () => Brain,
  BrainCircuit: () => BrainCircuit,
  BrainCog: () => BrainCog,
  BrickWall: () => BrickWall,
  BrickWallFire: () => BrickWallFire,
  BrickWallShield: () => BrickWallShield,
  Briefcase: () => Briefcase,
  BriefcaseBusiness: () => BriefcaseBusiness,
  BriefcaseConveyorBelt: () => BriefcaseConveyorBelt,
  BriefcaseMedical: () => BriefcaseMedical,
  BringToFront: () => BringToFront,
  Brush: () => Brush,
  BrushCleaning: () => BrushCleaning,
  Bubbles: () => Bubbles,
  Bug: () => Bug,
  BugOff: () => BugOff,
  BugPlay: () => BugPlay,
  Building: () => Building,
  Building2: () => Building2,
  Bus: () => Bus,
  BusFront: () => BusFront,
  Cable: () => Cable,
  CableCar: () => CableCar,
  Cake: () => Cake,
  CakeSlice: () => CakeSlice,
  Calculator: () => Calculator,
  Calendar: () => Calendar,
  Calendar1: () => Calendar1,
  CalendarArrowDown: () => CalendarArrowDown,
  CalendarArrowUp: () => CalendarArrowUp,
  CalendarCheck: () => CalendarCheck,
  CalendarCheck2: () => CalendarCheck2,
  CalendarClock: () => CalendarClock,
  CalendarCog: () => CalendarCog,
  CalendarDays: () => CalendarDays,
  CalendarFold: () => CalendarFold,
  CalendarHeart: () => CalendarHeart,
  CalendarMinus: () => CalendarMinus,
  CalendarMinus2: () => CalendarMinus2,
  CalendarOff: () => CalendarOff,
  CalendarPlus: () => CalendarPlus,
  CalendarPlus2: () => CalendarPlus2,
  CalendarRange: () => CalendarRange,
  CalendarSearch: () => CalendarSearch,
  CalendarSync: () => CalendarSync,
  CalendarX: () => CalendarX,
  CalendarX2: () => CalendarX2,
  Camera: () => Camera,
  CameraOff: () => CameraOff,
  CandlestickChart: () => ChartCandlestick,
  Candy: () => Candy,
  CandyCane: () => CandyCane,
  CandyOff: () => CandyOff,
  Cannabis: () => Cannabis,
  Captions: () => Captions,
  CaptionsOff: () => CaptionsOff,
  Car: () => Car,
  CarFront: () => CarFront,
  CarTaxiFront: () => CarTaxiFront,
  Caravan: () => Caravan,
  CardSim: () => CardSim,
  Carrot: () => Carrot,
  CaseLower: () => CaseLower,
  CaseSensitive: () => CaseSensitive,
  CaseUpper: () => CaseUpper,
  CassetteTape: () => CassetteTape,
  Cast: () => Cast,
  Castle: () => Castle,
  Cat: () => Cat,
  Cctv: () => Cctv,
  ChartArea: () => ChartArea,
  ChartBar: () => ChartBar,
  ChartBarBig: () => ChartBarBig,
  ChartBarDecreasing: () => ChartBarDecreasing,
  ChartBarIncreasing: () => ChartBarIncreasing,
  ChartBarStacked: () => ChartBarStacked,
  ChartCandlestick: () => ChartCandlestick,
  ChartColumn: () => ChartColumn,
  ChartColumnBig: () => ChartColumnBig,
  ChartColumnDecreasing: () => ChartColumnDecreasing,
  ChartColumnIncreasing: () => ChartColumnIncreasing,
  ChartColumnStacked: () => ChartColumnStacked,
  ChartGantt: () => ChartGantt,
  ChartLine: () => ChartLine,
  ChartNetwork: () => ChartNetwork,
  ChartNoAxesColumn: () => ChartNoAxesColumn,
  ChartNoAxesColumnDecreasing: () => ChartNoAxesColumnDecreasing,
  ChartNoAxesColumnIncreasing: () => ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined: () => ChartNoAxesCombined,
  ChartNoAxesGantt: () => ChartNoAxesGantt,
  ChartPie: () => ChartPie,
  ChartScatter: () => ChartScatter,
  ChartSpline: () => ChartSpline,
  Check: () => Check,
  CheckCheck: () => CheckCheck,
  CheckCircle: () => CircleCheckBig,
  CheckCircle2: () => CircleCheck,
  CheckLine: () => CheckLine,
  CheckSquare: () => SquareCheckBig,
  CheckSquare2: () => SquareCheck,
  ChefHat: () => ChefHat,
  Cherry: () => Cherry,
  ChevronDown: () => ChevronDown,
  ChevronDownCircle: () => CircleChevronDown,
  ChevronDownSquare: () => SquareChevronDown,
  ChevronFirst: () => ChevronFirst,
  ChevronLast: () => ChevronLast,
  ChevronLeft: () => ChevronLeft,
  ChevronLeftCircle: () => CircleChevronLeft,
  ChevronLeftSquare: () => SquareChevronLeft,
  ChevronRight: () => ChevronRight,
  ChevronRightCircle: () => CircleChevronRight,
  ChevronRightSquare: () => SquareChevronRight,
  ChevronUp: () => ChevronUp,
  ChevronUpCircle: () => CircleChevronUp,
  ChevronUpSquare: () => SquareChevronUp,
  ChevronsDown: () => ChevronsDown,
  ChevronsDownUp: () => ChevronsDownUp,
  ChevronsLeft: () => ChevronsLeft,
  ChevronsLeftRight: () => ChevronsLeftRight,
  ChevronsLeftRightEllipsis: () => ChevronsLeftRightEllipsis,
  ChevronsRight: () => ChevronsRight,
  ChevronsRightLeft: () => ChevronsRightLeft,
  ChevronsUp: () => ChevronsUp,
  ChevronsUpDown: () => ChevronsUpDown,
  Chrome: () => Chromium,
  Chromium: () => Chromium,
  Church: () => Church,
  Cigarette: () => Cigarette,
  CigaretteOff: () => CigaretteOff,
  Circle: () => Circle,
  CircleAlert: () => CircleAlert,
  CircleArrowDown: () => CircleArrowDown,
  CircleArrowLeft: () => CircleArrowLeft,
  CircleArrowOutDownLeft: () => CircleArrowOutDownLeft,
  CircleArrowOutDownRight: () => CircleArrowOutDownRight,
  CircleArrowOutUpLeft: () => CircleArrowOutUpLeft,
  CircleArrowOutUpRight: () => CircleArrowOutUpRight,
  CircleArrowRight: () => CircleArrowRight,
  CircleArrowUp: () => CircleArrowUp,
  CircleCheck: () => CircleCheck,
  CircleCheckBig: () => CircleCheckBig,
  CircleChevronDown: () => CircleChevronDown,
  CircleChevronLeft: () => CircleChevronLeft,
  CircleChevronRight: () => CircleChevronRight,
  CircleChevronUp: () => CircleChevronUp,
  CircleDashed: () => CircleDashed,
  CircleDivide: () => CircleDivide,
  CircleDollarSign: () => CircleDollarSign,
  CircleDot: () => CircleDot,
  CircleDotDashed: () => CircleDotDashed,
  CircleEllipsis: () => CircleEllipsis,
  CircleEqual: () => CircleEqual,
  CircleFadingArrowUp: () => CircleFadingArrowUp,
  CircleFadingPlus: () => CircleFadingPlus,
  CircleGauge: () => CircleGauge,
  CircleHelp: () => CircleQuestionMark,
  CircleMinus: () => CircleMinus,
  CircleOff: () => CircleOff,
  CircleParking: () => CircleParking,
  CircleParkingOff: () => CircleParkingOff,
  CirclePause: () => CirclePause,
  CirclePercent: () => CirclePercent,
  CirclePlay: () => CirclePlay,
  CirclePlus: () => CirclePlus,
  CirclePoundSterling: () => CirclePoundSterling,
  CirclePower: () => CirclePower,
  CircleQuestionMark: () => CircleQuestionMark,
  CircleSlash: () => CircleSlash,
  CircleSlash2: () => CircleSlash2,
  CircleSlashed: () => CircleSlash2,
  CircleSmall: () => CircleSmall,
  CircleStar: () => CircleStar,
  CircleStop: () => CircleStop,
  CircleUser: () => CircleUser,
  CircleUserRound: () => CircleUserRound,
  CircleX: () => CircleX,
  CircuitBoard: () => CircuitBoard,
  Citrus: () => Citrus,
  Clapperboard: () => Clapperboard,
  Clipboard: () => Clipboard2,
  ClipboardCheck: () => ClipboardCheck,
  ClipboardClock: () => ClipboardClock,
  ClipboardCopy: () => ClipboardCopy,
  ClipboardEdit: () => ClipboardPen,
  ClipboardList: () => ClipboardList,
  ClipboardMinus: () => ClipboardMinus,
  ClipboardPaste: () => ClipboardPaste,
  ClipboardPen: () => ClipboardPen,
  ClipboardPenLine: () => ClipboardPenLine,
  ClipboardPlus: () => ClipboardPlus,
  ClipboardSignature: () => ClipboardPenLine,
  ClipboardType: () => ClipboardType,
  ClipboardX: () => ClipboardX,
  Clock: () => Clock,
  Clock1: () => Clock1,
  Clock10: () => Clock10,
  Clock11: () => Clock11,
  Clock12: () => Clock12,
  Clock2: () => Clock2,
  Clock3: () => Clock3,
  Clock4: () => Clock4,
  Clock5: () => Clock5,
  Clock6: () => Clock6,
  Clock7: () => Clock7,
  Clock8: () => Clock8,
  Clock9: () => Clock9,
  ClockAlert: () => ClockAlert,
  ClockArrowDown: () => ClockArrowDown,
  ClockArrowUp: () => ClockArrowUp,
  ClockFading: () => ClockFading,
  ClockPlus: () => ClockPlus,
  ClosedCaption: () => ClosedCaption,
  Cloud: () => Cloud,
  CloudAlert: () => CloudAlert,
  CloudCheck: () => CloudCheck,
  CloudCog: () => CloudCog,
  CloudDownload: () => CloudDownload,
  CloudDrizzle: () => CloudDrizzle,
  CloudFog: () => CloudFog,
  CloudHail: () => CloudHail,
  CloudLightning: () => CloudLightning,
  CloudMoon: () => CloudMoon,
  CloudMoonRain: () => CloudMoonRain,
  CloudOff: () => CloudOff,
  CloudRain: () => CloudRain,
  CloudRainWind: () => CloudRainWind,
  CloudSnow: () => CloudSnow,
  CloudSun: () => CloudSun,
  CloudSunRain: () => CloudSunRain,
  CloudUpload: () => CloudUpload,
  Cloudy: () => Cloudy,
  Clover: () => Clover,
  Club: () => Club,
  Code: () => Code,
  Code2: () => CodeXml,
  CodeSquare: () => SquareCode,
  CodeXml: () => CodeXml,
  Codepen: () => Codepen,
  Codesandbox: () => Codesandbox,
  Coffee: () => Coffee,
  Cog: () => Cog,
  Coins: () => Coins,
  Columns: () => Columns2,
  Columns2: () => Columns2,
  Columns3: () => Columns3,
  Columns3Cog: () => Columns3Cog,
  Columns4: () => Columns4,
  ColumnsSettings: () => Columns3Cog,
  Combine: () => Combine,
  Command: () => Command,
  Compass: () => Compass,
  Component: () => Component2,
  Computer: () => Computer,
  ConciergeBell: () => ConciergeBell,
  Cone: () => Cone,
  Construction: () => Construction,
  Contact: () => Contact,
  Contact2: () => ContactRound,
  ContactRound: () => ContactRound,
  Container: () => Container,
  Contrast: () => Contrast,
  Cookie: () => Cookie,
  CookingPot: () => CookingPot,
  Copy: () => Copy,
  CopyCheck: () => CopyCheck,
  CopyMinus: () => CopyMinus,
  CopyPlus: () => CopyPlus,
  CopySlash: () => CopySlash,
  CopyX: () => CopyX,
  Copyleft: () => Copyleft,
  Copyright: () => Copyright,
  CornerDownLeft: () => CornerDownLeft,
  CornerDownRight: () => CornerDownRight,
  CornerLeftDown: () => CornerLeftDown,
  CornerLeftUp: () => CornerLeftUp,
  CornerRightDown: () => CornerRightDown,
  CornerRightUp: () => CornerRightUp,
  CornerUpLeft: () => CornerUpLeft,
  CornerUpRight: () => CornerUpRight,
  Cpu: () => Cpu,
  CreativeCommons: () => CreativeCommons,
  CreditCard: () => CreditCard,
  Croissant: () => Croissant,
  Crop: () => Crop,
  Cross: () => Cross,
  Crosshair: () => Crosshair,
  Crown: () => Crown,
  Cuboid: () => Cuboid,
  CupSoda: () => CupSoda,
  CurlyBraces: () => Braces,
  Currency: () => Currency,
  Cylinder: () => Cylinder,
  Dam: () => Dam,
  Database: () => Database,
  DatabaseBackup: () => DatabaseBackup,
  DatabaseZap: () => DatabaseZap,
  DecimalsArrowLeft: () => DecimalsArrowLeft,
  DecimalsArrowRight: () => DecimalsArrowRight,
  Delete: () => Delete,
  Dessert: () => Dessert,
  Diameter: () => Diameter,
  Diamond: () => Diamond,
  DiamondMinus: () => DiamondMinus,
  DiamondPercent: () => DiamondPercent,
  DiamondPlus: () => DiamondPlus,
  Dice1: () => Dice1,
  Dice2: () => Dice2,
  Dice3: () => Dice3,
  Dice4: () => Dice4,
  Dice5: () => Dice5,
  Dice6: () => Dice6,
  Dices: () => Dices,
  Diff: () => Diff,
  Disc: () => Disc,
  Disc2: () => Disc2,
  Disc3: () => Disc3,
  DiscAlbum: () => DiscAlbum,
  Divide: () => Divide,
  DivideCircle: () => CircleDivide,
  DivideSquare: () => SquareDivide,
  Dna: () => Dna,
  DnaOff: () => DnaOff,
  Dock: () => Dock,
  Dog: () => Dog,
  DollarSign: () => DollarSign,
  Donut: () => Donut,
  DoorClosed: () => DoorClosed,
  DoorClosedLocked: () => DoorClosedLocked,
  DoorOpen: () => DoorOpen,
  Dot: () => Dot,
  DotSquare: () => SquareDot,
  Download: () => Download,
  DownloadCloud: () => CloudDownload,
  DraftingCompass: () => DraftingCompass,
  Drama: () => Drama,
  Dribbble: () => Dribbble,
  Drill: () => Drill,
  Drone: () => Drone,
  Droplet: () => Droplet,
  DropletOff: () => DropletOff,
  Droplets: () => Droplets,
  Drum: () => Drum,
  Drumstick: () => Drumstick,
  Dumbbell: () => Dumbbell,
  Ear: () => Ear,
  EarOff: () => EarOff,
  Earth: () => Earth,
  EarthLock: () => EarthLock,
  Eclipse: () => Eclipse,
  Edit: () => SquarePen,
  Edit2: () => Pen,
  Edit3: () => PenLine,
  Egg: () => Egg,
  EggFried: () => EggFried,
  EggOff: () => EggOff,
  Ellipsis: () => Ellipsis,
  EllipsisVertical: () => EllipsisVertical,
  Equal: () => Equal,
  EqualApproximately: () => EqualApproximately,
  EqualNot: () => EqualNot,
  EqualSquare: () => SquareEqual,
  Eraser: () => Eraser,
  EthernetPort: () => EthernetPort,
  Euro: () => Euro,
  EvCharger: () => EvCharger,
  Expand: () => Expand,
  ExternalLink: () => ExternalLink,
  Eye: () => Eye,
  EyeClosed: () => EyeClosed,
  EyeOff: () => EyeOff,
  Facebook: () => Facebook,
  Factory: () => Factory,
  Fan: () => Fan,
  FastForward: () => FastForward,
  Feather: () => Feather,
  Fence: () => Fence,
  FerrisWheel: () => FerrisWheel,
  Figma: () => Figma,
  File: () => File,
  FileArchive: () => FileArchive,
  FileAudio: () => FileAudio,
  FileAudio2: () => FileAudio2,
  FileAxis3D: () => FileAxis3d,
  FileAxis3d: () => FileAxis3d,
  FileBadge: () => FileBadge,
  FileBadge2: () => FileBadge2,
  FileBarChart: () => FileChartColumnIncreasing,
  FileBarChart2: () => FileChartColumn,
  FileBox: () => FileBox,
  FileChartColumn: () => FileChartColumn,
  FileChartColumnIncreasing: () => FileChartColumnIncreasing,
  FileChartLine: () => FileChartLine,
  FileChartPie: () => FileChartPie,
  FileCheck: () => FileCheck,
  FileCheck2: () => FileCheck2,
  FileClock: () => FileClock,
  FileCode: () => FileCode,
  FileCode2: () => FileCode2,
  FileCog: () => FileCog,
  FileCog2: () => FileCog,
  FileDiff: () => FileDiff,
  FileDigit: () => FileDigit,
  FileDown: () => FileDown,
  FileEdit: () => FilePen,
  FileHeart: () => FileHeart,
  FileImage: () => FileImage,
  FileInput: () => FileInput,
  FileJson: () => FileJson,
  FileJson2: () => FileJson2,
  FileKey: () => FileKey,
  FileKey2: () => FileKey2,
  FileLineChart: () => FileChartLine,
  FileLock: () => FileLock,
  FileLock2: () => FileLock2,
  FileMinus: () => FileMinus,
  FileMinus2: () => FileMinus2,
  FileMusic: () => FileMusic,
  FileOutput: () => FileOutput,
  FilePen: () => FilePen,
  FilePenLine: () => FilePenLine,
  FilePieChart: () => FileChartPie,
  FilePlay: () => FilePlay,
  FilePlus: () => FilePlus,
  FilePlus2: () => FilePlus2,
  FileQuestion: () => FileQuestionMark,
  FileQuestionMark: () => FileQuestionMark,
  FileScan: () => FileScan,
  FileSearch: () => FileSearch,
  FileSearch2: () => FileSearch2,
  FileSignature: () => FilePenLine,
  FileSliders: () => FileSliders,
  FileSpreadsheet: () => FileSpreadsheet,
  FileStack: () => FileStack,
  FileSymlink: () => FileSymlink,
  FileTerminal: () => FileTerminal,
  FileText: () => FileText,
  FileType: () => FileType,
  FileType2: () => FileType2,
  FileUp: () => FileUp,
  FileUser: () => FileUser,
  FileVideo: () => FilePlay,
  FileVideo2: () => FileVideoCamera,
  FileVideoCamera: () => FileVideoCamera,
  FileVolume: () => FileVolume,
  FileVolume2: () => FileVolume2,
  FileWarning: () => FileWarning,
  FileX: () => FileX,
  FileX2: () => FileX2,
  Files: () => Files,
  Film: () => Film,
  Filter: () => Funnel,
  FilterX: () => FunnelX,
  Fingerprint: () => Fingerprint,
  FireExtinguisher: () => FireExtinguisher,
  Fish: () => Fish,
  FishOff: () => FishOff,
  FishSymbol: () => FishSymbol,
  Flag: () => Flag,
  FlagOff: () => FlagOff,
  FlagTriangleLeft: () => FlagTriangleLeft,
  FlagTriangleRight: () => FlagTriangleRight,
  Flame: () => Flame,
  FlameKindling: () => FlameKindling,
  Flashlight: () => Flashlight,
  FlashlightOff: () => FlashlightOff,
  FlaskConical: () => FlaskConical,
  FlaskConicalOff: () => FlaskConicalOff,
  FlaskRound: () => FlaskRound,
  FlipHorizontal: () => FlipHorizontal,
  FlipHorizontal2: () => FlipHorizontal2,
  FlipVertical: () => FlipVertical,
  FlipVertical2: () => FlipVertical2,
  Flower: () => Flower,
  Flower2: () => Flower2,
  Focus: () => Focus,
  FoldHorizontal: () => FoldHorizontal,
  FoldVertical: () => FoldVertical,
  Folder: () => Folder,
  FolderArchive: () => FolderArchive,
  FolderCheck: () => FolderCheck,
  FolderClock: () => FolderClock,
  FolderClosed: () => FolderClosed,
  FolderCode: () => FolderCode,
  FolderCog: () => FolderCog,
  FolderCog2: () => FolderCog,
  FolderDot: () => FolderDot,
  FolderDown: () => FolderDown,
  FolderEdit: () => FolderPen,
  FolderGit: () => FolderGit,
  FolderGit2: () => FolderGit2,
  FolderHeart: () => FolderHeart,
  FolderInput: () => FolderInput,
  FolderKanban: () => FolderKanban,
  FolderKey: () => FolderKey,
  FolderLock: () => FolderLock,
  FolderMinus: () => FolderMinus,
  FolderOpen: () => FolderOpen,
  FolderOpenDot: () => FolderOpenDot,
  FolderOutput: () => FolderOutput,
  FolderPen: () => FolderPen,
  FolderPlus: () => FolderPlus,
  FolderRoot: () => FolderRoot,
  FolderSearch: () => FolderSearch,
  FolderSearch2: () => FolderSearch2,
  FolderSymlink: () => FolderSymlink,
  FolderSync: () => FolderSync,
  FolderTree: () => FolderTree,
  FolderUp: () => FolderUp,
  FolderX: () => FolderX,
  Folders: () => Folders,
  Footprints: () => Footprints,
  ForkKnife: () => Utensils,
  ForkKnifeCrossed: () => UtensilsCrossed,
  Forklift: () => Forklift,
  FormInput: () => RectangleEllipsis,
  Forward: () => Forward,
  Frame: () => Frame,
  Framer: () => Framer,
  Frown: () => Frown,
  Fuel: () => Fuel,
  Fullscreen: () => Fullscreen,
  FunctionSquare: () => SquareFunction,
  Funnel: () => Funnel,
  FunnelPlus: () => FunnelPlus,
  FunnelX: () => FunnelX,
  GalleryHorizontal: () => GalleryHorizontal,
  GalleryHorizontalEnd: () => GalleryHorizontalEnd,
  GalleryThumbnails: () => GalleryThumbnails,
  GalleryVertical: () => GalleryVertical,
  GalleryVerticalEnd: () => GalleryVerticalEnd,
  Gamepad: () => Gamepad,
  Gamepad2: () => Gamepad2,
  GamepadDirectional: () => GamepadDirectional,
  GanttChart: () => ChartNoAxesGantt,
  GanttChartSquare: () => SquareChartGantt,
  Gauge: () => Gauge,
  GaugeCircle: () => CircleGauge,
  Gavel: () => Gavel,
  Gem: () => Gem,
  GeorgianLari: () => GeorgianLari,
  Ghost: () => Ghost,
  Gift: () => Gift,
  GitBranch: () => GitBranch,
  GitBranchPlus: () => GitBranchPlus,
  GitCommit: () => GitCommitHorizontal,
  GitCommitHorizontal: () => GitCommitHorizontal,
  GitCommitVertical: () => GitCommitVertical,
  GitCompare: () => GitCompare,
  GitCompareArrows: () => GitCompareArrows,
  GitFork: () => GitFork,
  GitGraph: () => GitGraph,
  GitMerge: () => GitMerge,
  GitPullRequest: () => GitPullRequest,
  GitPullRequestArrow: () => GitPullRequestArrow,
  GitPullRequestClosed: () => GitPullRequestClosed,
  GitPullRequestCreate: () => GitPullRequestCreate,
  GitPullRequestCreateArrow: () => GitPullRequestCreateArrow,
  GitPullRequestDraft: () => GitPullRequestDraft,
  Github: () => Github,
  Gitlab: () => Gitlab,
  GlassWater: () => GlassWater,
  Glasses: () => Glasses,
  Globe: () => Globe,
  Globe2: () => Earth,
  GlobeLock: () => GlobeLock,
  Goal: () => Goal,
  Gpu: () => Gpu,
  Grab: () => HandGrab,
  GraduationCap: () => GraduationCap,
  Grape: () => Grape,
  Grid: () => Grid3x3,
  Grid2X2: () => Grid2x2,
  Grid2X2Check: () => Grid2x2Check,
  Grid2X2Plus: () => Grid2x2Plus,
  Grid2X2X: () => Grid2x2X,
  Grid2x2: () => Grid2x2,
  Grid2x2Check: () => Grid2x2Check,
  Grid2x2Plus: () => Grid2x2Plus,
  Grid2x2X: () => Grid2x2X,
  Grid3X3: () => Grid3x3,
  Grid3x2: () => Grid3x2,
  Grid3x3: () => Grid3x3,
  Grip: () => Grip,
  GripHorizontal: () => GripHorizontal,
  GripVertical: () => GripVertical,
  Group: () => Group,
  Guitar: () => Guitar,
  Ham: () => Ham,
  Hamburger: () => Hamburger,
  Hammer: () => Hammer,
  Hand: () => Hand,
  HandCoins: () => HandCoins,
  HandFist: () => HandFist,
  HandGrab: () => HandGrab,
  HandHeart: () => HandHeart,
  HandHelping: () => HandHelping,
  HandMetal: () => HandMetal,
  HandPlatter: () => HandPlatter,
  Handbag: () => Handbag,
  Handshake: () => Handshake,
  HardDrive: () => HardDrive,
  HardDriveDownload: () => HardDriveDownload,
  HardDriveUpload: () => HardDriveUpload,
  HardHat: () => HardHat,
  Hash: () => Hash,
  HatGlasses: () => HatGlasses,
  Haze: () => Haze,
  HdmiPort: () => HdmiPort,
  Heading: () => Heading,
  Heading1: () => Heading1,
  Heading2: () => Heading2,
  Heading3: () => Heading3,
  Heading4: () => Heading4,
  Heading5: () => Heading5,
  Heading6: () => Heading6,
  HeadphoneOff: () => HeadphoneOff,
  Headphones: () => Headphones,
  Headset: () => Headset,
  Heart: () => Heart,
  HeartCrack: () => HeartCrack,
  HeartHandshake: () => HeartHandshake,
  HeartMinus: () => HeartMinus,
  HeartOff: () => HeartOff,
  HeartPlus: () => HeartPlus,
  HeartPulse: () => HeartPulse,
  Heater: () => Heater,
  HelpCircle: () => CircleQuestionMark,
  HelpingHand: () => HandHelping,
  Hexagon: () => Hexagon,
  Highlighter: () => Highlighter,
  History: () => History,
  Home: () => House,
  Hop: () => Hop,
  HopOff: () => HopOff,
  Hospital: () => Hospital,
  Hotel: () => Hotel,
  Hourglass: () => Hourglass,
  House: () => House,
  HouseHeart: () => HouseHeart,
  HousePlug: () => HousePlug,
  HousePlus: () => HousePlus,
  HouseWifi: () => HouseWifi,
  IceCream: () => IceCreamCone,
  IceCream2: () => IceCreamBowl,
  IceCreamBowl: () => IceCreamBowl,
  IceCreamCone: () => IceCreamCone,
  IdCard: () => IdCard,
  IdCardLanyard: () => IdCardLanyard,
  Image: () => Image,
  ImageDown: () => ImageDown,
  ImageMinus: () => ImageMinus,
  ImageOff: () => ImageOff,
  ImagePlay: () => ImagePlay,
  ImagePlus: () => ImagePlus,
  ImageUp: () => ImageUp,
  ImageUpscale: () => ImageUpscale,
  Images: () => Images,
  Import: () => Import,
  Inbox: () => Inbox,
  Indent: () => ListIndentIncrease,
  IndentDecrease: () => ListIndentDecrease,
  IndentIncrease: () => ListIndentIncrease,
  IndianRupee: () => IndianRupee,
  Infinity: () => Infinity2,
  Info: () => Info,
  Inspect: () => SquareMousePointer,
  InspectionPanel: () => InspectionPanel,
  Instagram: () => Instagram,
  Italic: () => Italic,
  IterationCcw: () => IterationCcw,
  IterationCw: () => IterationCw,
  JapaneseYen: () => JapaneseYen,
  Joystick: () => Joystick,
  Kanban: () => Kanban,
  KanbanSquare: () => SquareKanban,
  KanbanSquareDashed: () => SquareDashedKanban,
  Kayak: () => Kayak,
  Key: () => Key,
  KeyRound: () => KeyRound,
  KeySquare: () => KeySquare,
  Keyboard: () => Keyboard,
  KeyboardMusic: () => KeyboardMusic,
  KeyboardOff: () => KeyboardOff,
  Lamp: () => Lamp,
  LampCeiling: () => LampCeiling,
  LampDesk: () => LampDesk,
  LampFloor: () => LampFloor,
  LampWallDown: () => LampWallDown,
  LampWallUp: () => LampWallUp,
  LandPlot: () => LandPlot,
  Landmark: () => Landmark,
  Languages: () => Languages,
  Laptop: () => Laptop,
  Laptop2: () => LaptopMinimal,
  LaptopMinimal: () => LaptopMinimal,
  LaptopMinimalCheck: () => LaptopMinimalCheck,
  Lasso: () => Lasso,
  LassoSelect: () => LassoSelect,
  Laugh: () => Laugh,
  Layers: () => Layers,
  Layers2: () => Layers2,
  Layers3: () => Layers,
  Layout: () => PanelsTopLeft,
  LayoutDashboard: () => LayoutDashboard,
  LayoutGrid: () => LayoutGrid,
  LayoutList: () => LayoutList,
  LayoutPanelLeft: () => LayoutPanelLeft,
  LayoutPanelTop: () => LayoutPanelTop,
  LayoutTemplate: () => LayoutTemplate,
  Leaf: () => Leaf,
  LeafyGreen: () => LeafyGreen,
  Lectern: () => Lectern,
  LetterText: () => TextInitial,
  Library: () => Library,
  LibraryBig: () => LibraryBig,
  LibrarySquare: () => SquareLibrary,
  LifeBuoy: () => LifeBuoy,
  Ligature: () => Ligature,
  Lightbulb: () => Lightbulb,
  LightbulbOff: () => LightbulbOff,
  LineChart: () => ChartLine,
  LineSquiggle: () => LineSquiggle,
  Link: () => Link,
  Link2: () => Link2,
  Link2Off: () => Link2Off,
  Linkedin: () => Linkedin,
  List: () => List,
  ListCheck: () => ListCheck,
  ListChecks: () => ListChecks,
  ListChevronsDownUp: () => ListChevronsDownUp,
  ListChevronsUpDown: () => ListChevronsUpDown,
  ListCollapse: () => ListCollapse,
  ListEnd: () => ListEnd,
  ListFilter: () => ListFilter,
  ListFilterPlus: () => ListFilterPlus,
  ListIndentDecrease: () => ListIndentDecrease,
  ListIndentIncrease: () => ListIndentIncrease,
  ListMinus: () => ListMinus,
  ListMusic: () => ListMusic,
  ListOrdered: () => ListOrdered,
  ListPlus: () => ListPlus,
  ListRestart: () => ListRestart,
  ListStart: () => ListStart,
  ListTodo: () => ListTodo,
  ListTree: () => ListTree,
  ListVideo: () => ListVideo,
  ListX: () => ListX,
  Loader: () => Loader,
  Loader2: () => LoaderCircle,
  LoaderCircle: () => LoaderCircle,
  LoaderPinwheel: () => LoaderPinwheel,
  Locate: () => Locate,
  LocateFixed: () => LocateFixed,
  LocateOff: () => LocateOff,
  LocationEdit: () => MapPinPen,
  Lock: () => Lock,
  LockKeyhole: () => LockKeyhole,
  LockKeyholeOpen: () => LockKeyholeOpen,
  LockOpen: () => LockOpen,
  LogIn: () => LogIn,
  LogOut: () => LogOut,
  Logs: () => Logs,
  Lollipop: () => Lollipop,
  Luggage: () => Luggage,
  MSquare: () => SquareM,
  Magnet: () => Magnet,
  Mail: () => Mail,
  MailCheck: () => MailCheck,
  MailMinus: () => MailMinus,
  MailOpen: () => MailOpen,
  MailPlus: () => MailPlus,
  MailQuestion: () => MailQuestionMark,
  MailQuestionMark: () => MailQuestionMark,
  MailSearch: () => MailSearch,
  MailWarning: () => MailWarning,
  MailX: () => MailX,
  Mailbox: () => Mailbox,
  Mails: () => Mails,
  Map: () => Map2,
  MapMinus: () => MapMinus,
  MapPin: () => MapPin,
  MapPinCheck: () => MapPinCheck,
  MapPinCheckInside: () => MapPinCheckInside,
  MapPinHouse: () => MapPinHouse,
  MapPinMinus: () => MapPinMinus,
  MapPinMinusInside: () => MapPinMinusInside,
  MapPinOff: () => MapPinOff,
  MapPinPen: () => MapPinPen,
  MapPinPlus: () => MapPinPlus,
  MapPinPlusInside: () => MapPinPlusInside,
  MapPinX: () => MapPinX,
  MapPinXInside: () => MapPinXInside,
  MapPinned: () => MapPinned,
  MapPlus: () => MapPlus,
  Mars: () => Mars,
  MarsStroke: () => MarsStroke,
  Martini: () => Martini,
  Maximize: () => Maximize,
  Maximize2: () => Maximize2,
  Medal: () => Medal,
  Megaphone: () => Megaphone,
  MegaphoneOff: () => MegaphoneOff,
  Meh: () => Meh,
  MemoryStick: () => MemoryStick,
  Menu: () => Menu,
  MenuSquare: () => SquareMenu,
  Merge: () => Merge,
  MessageCircle: () => MessageCircle,
  MessageCircleCode: () => MessageCircleCode,
  MessageCircleDashed: () => MessageCircleDashed,
  MessageCircleHeart: () => MessageCircleHeart,
  MessageCircleMore: () => MessageCircleMore,
  MessageCircleOff: () => MessageCircleOff,
  MessageCirclePlus: () => MessageCirclePlus,
  MessageCircleQuestion: () => MessageCircleQuestionMark,
  MessageCircleQuestionMark: () => MessageCircleQuestionMark,
  MessageCircleReply: () => MessageCircleReply,
  MessageCircleWarning: () => MessageCircleWarning,
  MessageCircleX: () => MessageCircleX,
  MessageSquare: () => MessageSquare,
  MessageSquareCode: () => MessageSquareCode,
  MessageSquareDashed: () => MessageSquareDashed,
  MessageSquareDiff: () => MessageSquareDiff,
  MessageSquareDot: () => MessageSquareDot,
  MessageSquareHeart: () => MessageSquareHeart,
  MessageSquareLock: () => MessageSquareLock,
  MessageSquareMore: () => MessageSquareMore,
  MessageSquareOff: () => MessageSquareOff,
  MessageSquarePlus: () => MessageSquarePlus,
  MessageSquareQuote: () => MessageSquareQuote,
  MessageSquareReply: () => MessageSquareReply,
  MessageSquareShare: () => MessageSquareShare,
  MessageSquareText: () => MessageSquareText,
  MessageSquareWarning: () => MessageSquareWarning,
  MessageSquareX: () => MessageSquareX,
  MessagesSquare: () => MessagesSquare,
  Mic: () => Mic,
  Mic2: () => MicVocal,
  MicOff: () => MicOff,
  MicVocal: () => MicVocal,
  Microchip: () => Microchip,
  Microscope: () => Microscope,
  Microwave: () => Microwave,
  Milestone: () => Milestone,
  Milk: () => Milk,
  MilkOff: () => MilkOff,
  Minimize: () => Minimize,
  Minimize2: () => Minimize2,
  Minus: () => Minus,
  MinusCircle: () => CircleMinus,
  MinusSquare: () => SquareMinus,
  Monitor: () => Monitor,
  MonitorCheck: () => MonitorCheck,
  MonitorCloud: () => MonitorCloud,
  MonitorCog: () => MonitorCog,
  MonitorDot: () => MonitorDot,
  MonitorDown: () => MonitorDown,
  MonitorOff: () => MonitorOff,
  MonitorPause: () => MonitorPause,
  MonitorPlay: () => MonitorPlay,
  MonitorSmartphone: () => MonitorSmartphone,
  MonitorSpeaker: () => MonitorSpeaker,
  MonitorStop: () => MonitorStop,
  MonitorUp: () => MonitorUp,
  MonitorX: () => MonitorX,
  Moon: () => Moon,
  MoonStar: () => MoonStar,
  MoreHorizontal: () => Ellipsis,
  MoreVertical: () => EllipsisVertical,
  Motorbike: () => Motorbike,
  Mountain: () => Mountain,
  MountainSnow: () => MountainSnow,
  Mouse: () => Mouse,
  MouseOff: () => MouseOff,
  MousePointer: () => MousePointer,
  MousePointer2: () => MousePointer2,
  MousePointerBan: () => MousePointerBan,
  MousePointerClick: () => MousePointerClick,
  MousePointerSquareDashed: () => SquareDashedMousePointer,
  Move: () => Move,
  Move3D: () => Move3d,
  Move3d: () => Move3d,
  MoveDiagonal: () => MoveDiagonal,
  MoveDiagonal2: () => MoveDiagonal2,
  MoveDown: () => MoveDown,
  MoveDownLeft: () => MoveDownLeft,
  MoveDownRight: () => MoveDownRight,
  MoveHorizontal: () => MoveHorizontal,
  MoveLeft: () => MoveLeft,
  MoveRight: () => MoveRight,
  MoveUp: () => MoveUp,
  MoveUpLeft: () => MoveUpLeft,
  MoveUpRight: () => MoveUpRight,
  MoveVertical: () => MoveVertical,
  Music: () => Music,
  Music2: () => Music2,
  Music3: () => Music3,
  Music4: () => Music4,
  Navigation: () => Navigation,
  Navigation2: () => Navigation2,
  Navigation2Off: () => Navigation2Off,
  NavigationOff: () => NavigationOff,
  Network: () => Network,
  Newspaper: () => Newspaper,
  Nfc: () => Nfc,
  NonBinary: () => NonBinary,
  Notebook: () => Notebook,
  NotebookPen: () => NotebookPen,
  NotebookTabs: () => NotebookTabs,
  NotebookText: () => NotebookText,
  NotepadText: () => NotepadText,
  NotepadTextDashed: () => NotepadTextDashed,
  Nut: () => Nut,
  NutOff: () => NutOff,
  Octagon: () => Octagon,
  OctagonAlert: () => OctagonAlert,
  OctagonMinus: () => OctagonMinus,
  OctagonPause: () => OctagonPause,
  OctagonX: () => OctagonX,
  Omega: () => Omega,
  Option: () => Option,
  Orbit: () => Orbit,
  Origami: () => Origami,
  Outdent: () => ListIndentDecrease,
  Package: () => Package,
  Package2: () => Package2,
  PackageCheck: () => PackageCheck,
  PackageMinus: () => PackageMinus,
  PackageOpen: () => PackageOpen,
  PackagePlus: () => PackagePlus,
  PackageSearch: () => PackageSearch,
  PackageX: () => PackageX,
  PaintBucket: () => PaintBucket,
  PaintRoller: () => PaintRoller,
  Paintbrush: () => Paintbrush,
  Paintbrush2: () => PaintbrushVertical,
  PaintbrushVertical: () => PaintbrushVertical,
  Palette: () => Palette,
  Palmtree: () => TreePalm,
  Panda: () => Panda,
  PanelBottom: () => PanelBottom,
  PanelBottomClose: () => PanelBottomClose,
  PanelBottomDashed: () => PanelBottomDashed,
  PanelBottomInactive: () => PanelBottomDashed,
  PanelBottomOpen: () => PanelBottomOpen,
  PanelLeft: () => PanelLeft,
  PanelLeftClose: () => PanelLeftClose,
  PanelLeftDashed: () => PanelLeftDashed,
  PanelLeftInactive: () => PanelLeftDashed,
  PanelLeftOpen: () => PanelLeftOpen,
  PanelLeftRightDashed: () => PanelLeftRightDashed,
  PanelRight: () => PanelRight,
  PanelRightClose: () => PanelRightClose,
  PanelRightDashed: () => PanelRightDashed,
  PanelRightInactive: () => PanelRightDashed,
  PanelRightOpen: () => PanelRightOpen,
  PanelTop: () => PanelTop,
  PanelTopBottomDashed: () => PanelTopBottomDashed,
  PanelTopClose: () => PanelTopClose,
  PanelTopDashed: () => PanelTopDashed,
  PanelTopInactive: () => PanelTopDashed,
  PanelTopOpen: () => PanelTopOpen,
  PanelsLeftBottom: () => PanelsLeftBottom,
  PanelsLeftRight: () => Columns3,
  PanelsRightBottom: () => PanelsRightBottom,
  PanelsTopBottom: () => Rows3,
  PanelsTopLeft: () => PanelsTopLeft,
  Paperclip: () => Paperclip,
  Parentheses: () => Parentheses,
  ParkingCircle: () => CircleParking,
  ParkingCircleOff: () => CircleParkingOff,
  ParkingMeter: () => ParkingMeter,
  ParkingSquare: () => SquareParking,
  ParkingSquareOff: () => SquareParkingOff,
  PartyPopper: () => PartyPopper,
  Pause: () => Pause,
  PauseCircle: () => CirclePause,
  PauseOctagon: () => OctagonPause,
  PawPrint: () => PawPrint,
  PcCase: () => PcCase,
  Pen: () => Pen,
  PenBox: () => SquarePen,
  PenLine: () => PenLine,
  PenOff: () => PenOff,
  PenSquare: () => SquarePen,
  PenTool: () => PenTool,
  Pencil: () => Pencil,
  PencilLine: () => PencilLine,
  PencilOff: () => PencilOff,
  PencilRuler: () => PencilRuler,
  Pentagon: () => Pentagon,
  Percent: () => Percent,
  PercentCircle: () => CirclePercent,
  PercentDiamond: () => DiamondPercent,
  PercentSquare: () => SquarePercent,
  PersonStanding: () => PersonStanding,
  PhilippinePeso: () => PhilippinePeso,
  Phone: () => Phone,
  PhoneCall: () => PhoneCall,
  PhoneForwarded: () => PhoneForwarded,
  PhoneIncoming: () => PhoneIncoming,
  PhoneMissed: () => PhoneMissed,
  PhoneOff: () => PhoneOff,
  PhoneOutgoing: () => PhoneOutgoing,
  Pi: () => Pi,
  PiSquare: () => SquarePi,
  Piano: () => Piano,
  Pickaxe: () => Pickaxe,
  PictureInPicture: () => PictureInPicture,
  PictureInPicture2: () => PictureInPicture2,
  PieChart: () => ChartPie,
  PiggyBank: () => PiggyBank,
  Pilcrow: () => Pilcrow,
  PilcrowLeft: () => PilcrowLeft,
  PilcrowRight: () => PilcrowRight,
  PilcrowSquare: () => SquarePilcrow,
  Pill: () => Pill,
  PillBottle: () => PillBottle,
  Pin: () => Pin,
  PinOff: () => PinOff,
  Pipette: () => Pipette,
  Pizza: () => Pizza,
  Plane: () => Plane,
  PlaneLanding: () => PlaneLanding,
  PlaneTakeoff: () => PlaneTakeoff,
  Play: () => Play,
  PlayCircle: () => CirclePlay,
  PlaySquare: () => SquarePlay,
  Plug: () => Plug,
  Plug2: () => Plug2,
  PlugZap: () => PlugZap,
  PlugZap2: () => PlugZap,
  Plus: () => Plus,
  PlusCircle: () => CirclePlus,
  PlusSquare: () => SquarePlus,
  Pocket: () => Pocket,
  PocketKnife: () => PocketKnife,
  Podcast: () => Podcast,
  Pointer: () => Pointer2,
  PointerOff: () => PointerOff,
  Popcorn: () => Popcorn,
  Popsicle: () => Popsicle,
  PoundSterling: () => PoundSterling,
  Power: () => Power,
  PowerCircle: () => CirclePower,
  PowerOff: () => PowerOff,
  PowerSquare: () => SquarePower,
  Presentation: () => Presentation,
  Printer: () => Printer,
  PrinterCheck: () => PrinterCheck,
  Projector: () => Projector,
  Proportions: () => Proportions,
  Puzzle: () => Puzzle,
  Pyramid: () => Pyramid,
  QrCode: () => QrCode,
  Quote: () => Quote,
  Rabbit: () => Rabbit,
  Radar: () => Radar,
  Radiation: () => Radiation,
  Radical: () => Radical,
  Radio: () => Radio,
  RadioReceiver: () => RadioReceiver,
  RadioTower: () => RadioTower,
  Radius: () => Radius,
  RailSymbol: () => RailSymbol,
  Rainbow: () => Rainbow,
  Rat: () => Rat,
  Ratio: () => Ratio,
  Receipt: () => Receipt,
  ReceiptCent: () => ReceiptCent,
  ReceiptEuro: () => ReceiptEuro,
  ReceiptIndianRupee: () => ReceiptIndianRupee,
  ReceiptJapaneseYen: () => ReceiptJapaneseYen,
  ReceiptPoundSterling: () => ReceiptPoundSterling,
  ReceiptRussianRuble: () => ReceiptRussianRuble,
  ReceiptSwissFranc: () => ReceiptSwissFranc,
  ReceiptText: () => ReceiptText,
  ReceiptTurkishLira: () => ReceiptTurkishLira,
  RectangleCircle: () => RectangleCircle,
  RectangleEllipsis: () => RectangleEllipsis,
  RectangleGoggles: () => RectangleGoggles,
  RectangleHorizontal: () => RectangleHorizontal,
  RectangleVertical: () => RectangleVertical,
  Recycle: () => Recycle,
  Redo: () => Redo,
  Redo2: () => Redo2,
  RedoDot: () => RedoDot,
  RefreshCcw: () => RefreshCcw,
  RefreshCcwDot: () => RefreshCcwDot,
  RefreshCw: () => RefreshCw,
  RefreshCwOff: () => RefreshCwOff,
  Refrigerator: () => Refrigerator,
  Regex: () => Regex,
  RemoveFormatting: () => RemoveFormatting,
  Repeat: () => Repeat,
  Repeat1: () => Repeat1,
  Repeat2: () => Repeat2,
  Replace: () => Replace,
  ReplaceAll: () => ReplaceAll,
  Reply: () => Reply,
  ReplyAll: () => ReplyAll,
  Rewind: () => Rewind,
  Ribbon: () => Ribbon,
  Rocket: () => Rocket,
  RockingChair: () => RockingChair,
  RollerCoaster: () => RollerCoaster,
  Rose: () => Rose,
  Rotate3D: () => Rotate3d,
  Rotate3d: () => Rotate3d,
  RotateCcw: () => RotateCcw,
  RotateCcwKey: () => RotateCcwKey,
  RotateCcwSquare: () => RotateCcwSquare,
  RotateCw: () => RotateCw,
  RotateCwSquare: () => RotateCwSquare,
  Route: () => Route,
  RouteOff: () => RouteOff,
  Router: () => Router,
  Rows: () => Rows2,
  Rows2: () => Rows2,
  Rows3: () => Rows3,
  Rows4: () => Rows4,
  Rss: () => Rss,
  Ruler: () => Ruler,
  RulerDimensionLine: () => RulerDimensionLine,
  RussianRuble: () => RussianRuble,
  Sailboat: () => Sailboat,
  Salad: () => Salad,
  Sandwich: () => Sandwich,
  Satellite: () => Satellite,
  SatelliteDish: () => SatelliteDish,
  SaudiRiyal: () => SaudiRiyal,
  Save: () => Save,
  SaveAll: () => SaveAll,
  SaveOff: () => SaveOff,
  Scale: () => Scale,
  Scale3D: () => Scale3d,
  Scale3d: () => Scale3d,
  Scaling: () => Scaling,
  Scan: () => Scan,
  ScanBarcode: () => ScanBarcode,
  ScanEye: () => ScanEye,
  ScanFace: () => ScanFace,
  ScanHeart: () => ScanHeart,
  ScanLine: () => ScanLine,
  ScanQrCode: () => ScanQrCode,
  ScanSearch: () => ScanSearch,
  ScanText: () => ScanText,
  ScatterChart: () => ChartScatter,
  School: () => School,
  School2: () => University,
  Scissors: () => Scissors,
  ScissorsLineDashed: () => ScissorsLineDashed,
  ScissorsSquare: () => SquareScissors,
  ScissorsSquareDashedBottom: () => SquareBottomDashedScissors,
  ScreenShare: () => ScreenShare,
  ScreenShareOff: () => ScreenShareOff,
  Scroll: () => Scroll,
  ScrollText: () => ScrollText,
  Search: () => Search,
  SearchCheck: () => SearchCheck,
  SearchCode: () => SearchCode,
  SearchSlash: () => SearchSlash,
  SearchX: () => SearchX,
  Section: () => Section,
  Send: () => Send,
  SendHorizonal: () => SendHorizontal,
  SendHorizontal: () => SendHorizontal,
  SendToBack: () => SendToBack,
  SeparatorHorizontal: () => SeparatorHorizontal,
  SeparatorVertical: () => SeparatorVertical,
  Server: () => Server,
  ServerCog: () => ServerCog,
  ServerCrash: () => ServerCrash,
  ServerOff: () => ServerOff,
  Settings: () => Settings,
  Settings2: () => Settings2,
  Shapes: () => Shapes,
  Share: () => Share,
  Share2: () => Share2,
  Sheet: () => Sheet,
  Shell: () => Shell,
  Shield: () => Shield,
  ShieldAlert: () => ShieldAlert,
  ShieldBan: () => ShieldBan,
  ShieldCheck: () => ShieldCheck,
  ShieldClose: () => ShieldX,
  ShieldEllipsis: () => ShieldEllipsis,
  ShieldHalf: () => ShieldHalf,
  ShieldMinus: () => ShieldMinus,
  ShieldOff: () => ShieldOff,
  ShieldPlus: () => ShieldPlus,
  ShieldQuestion: () => ShieldQuestionMark,
  ShieldQuestionMark: () => ShieldQuestionMark,
  ShieldUser: () => ShieldUser,
  ShieldX: () => ShieldX,
  Ship: () => Ship,
  ShipWheel: () => ShipWheel,
  Shirt: () => Shirt,
  ShoppingBag: () => ShoppingBag,
  ShoppingBasket: () => ShoppingBasket,
  ShoppingCart: () => ShoppingCart,
  Shovel: () => Shovel,
  ShowerHead: () => ShowerHead,
  Shredder: () => Shredder,
  Shrimp: () => Shrimp,
  Shrink: () => Shrink,
  Shrub: () => Shrub,
  Shuffle: () => Shuffle,
  Sidebar: () => PanelLeft,
  SidebarClose: () => PanelLeftClose,
  SidebarOpen: () => PanelLeftOpen,
  Sigma: () => Sigma,
  SigmaSquare: () => SquareSigma,
  Signal: () => Signal,
  SignalHigh: () => SignalHigh,
  SignalLow: () => SignalLow,
  SignalMedium: () => SignalMedium,
  SignalZero: () => SignalZero,
  Signature: () => Signature,
  Signpost: () => Signpost,
  SignpostBig: () => SignpostBig,
  Siren: () => Siren,
  SkipBack: () => SkipBack,
  SkipForward: () => SkipForward,
  Skull: () => Skull,
  Slack: () => Slack,
  Slash: () => Slash,
  SlashSquare: () => SquareSlash,
  Slice: () => Slice,
  Sliders: () => SlidersVertical,
  SlidersHorizontal: () => SlidersHorizontal,
  SlidersVertical: () => SlidersVertical,
  Smartphone: () => Smartphone,
  SmartphoneCharging: () => SmartphoneCharging,
  SmartphoneNfc: () => SmartphoneNfc,
  Smile: () => Smile,
  SmilePlus: () => SmilePlus,
  Snail: () => Snail,
  Snowflake: () => Snowflake,
  SoapDispenserDroplet: () => SoapDispenserDroplet,
  Sofa: () => Sofa,
  SortAsc: () => ArrowUpNarrowWide,
  SortDesc: () => ArrowDownWideNarrow,
  Soup: () => Soup,
  Space: () => Space,
  Spade: () => Spade,
  Sparkle: () => Sparkle,
  Sparkles: () => Sparkles,
  Speaker: () => Speaker,
  Speech: () => Speech,
  SpellCheck: () => SpellCheck,
  SpellCheck2: () => SpellCheck2,
  Spline: () => Spline,
  SplinePointer: () => SplinePointer,
  Split: () => Split,
  SplitSquareHorizontal: () => SquareSplitHorizontal,
  SplitSquareVertical: () => SquareSplitVertical,
  Spool: () => Spool,
  Spotlight: () => Spotlight,
  SprayCan: () => SprayCan,
  Sprout: () => Sprout,
  Square: () => Square,
  SquareActivity: () => SquareActivity,
  SquareArrowDown: () => SquareArrowDown,
  SquareArrowDownLeft: () => SquareArrowDownLeft,
  SquareArrowDownRight: () => SquareArrowDownRight,
  SquareArrowLeft: () => SquareArrowLeft,
  SquareArrowOutDownLeft: () => SquareArrowOutDownLeft,
  SquareArrowOutDownRight: () => SquareArrowOutDownRight,
  SquareArrowOutUpLeft: () => SquareArrowOutUpLeft,
  SquareArrowOutUpRight: () => SquareArrowOutUpRight,
  SquareArrowRight: () => SquareArrowRight,
  SquareArrowUp: () => SquareArrowUp,
  SquareArrowUpLeft: () => SquareArrowUpLeft,
  SquareArrowUpRight: () => SquareArrowUpRight,
  SquareAsterisk: () => SquareAsterisk,
  SquareBottomDashedScissors: () => SquareBottomDashedScissors,
  SquareChartGantt: () => SquareChartGantt,
  SquareCheck: () => SquareCheck,
  SquareCheckBig: () => SquareCheckBig,
  SquareChevronDown: () => SquareChevronDown,
  SquareChevronLeft: () => SquareChevronLeft,
  SquareChevronRight: () => SquareChevronRight,
  SquareChevronUp: () => SquareChevronUp,
  SquareCode: () => SquareCode,
  SquareDashed: () => SquareDashed,
  SquareDashedBottom: () => SquareDashedBottom,
  SquareDashedBottomCode: () => SquareDashedBottomCode,
  SquareDashedKanban: () => SquareDashedKanban,
  SquareDashedMousePointer: () => SquareDashedMousePointer,
  SquareDashedTopSolid: () => SquareDashedTopSolid,
  SquareDivide: () => SquareDivide,
  SquareDot: () => SquareDot,
  SquareEqual: () => SquareEqual,
  SquareFunction: () => SquareFunction,
  SquareGanttChart: () => SquareChartGantt,
  SquareKanban: () => SquareKanban,
  SquareLibrary: () => SquareLibrary,
  SquareM: () => SquareM,
  SquareMenu: () => SquareMenu,
  SquareMinus: () => SquareMinus,
  SquareMousePointer: () => SquareMousePointer,
  SquareParking: () => SquareParking,
  SquareParkingOff: () => SquareParkingOff,
  SquarePause: () => SquarePause,
  SquarePen: () => SquarePen,
  SquarePercent: () => SquarePercent,
  SquarePi: () => SquarePi,
  SquarePilcrow: () => SquarePilcrow,
  SquarePlay: () => SquarePlay,
  SquarePlus: () => SquarePlus,
  SquarePower: () => SquarePower,
  SquareRadical: () => SquareRadical,
  SquareRoundCorner: () => SquareRoundCorner,
  SquareScissors: () => SquareScissors,
  SquareSigma: () => SquareSigma,
  SquareSlash: () => SquareSlash,
  SquareSplitHorizontal: () => SquareSplitHorizontal,
  SquareSplitVertical: () => SquareSplitVertical,
  SquareSquare: () => SquareSquare,
  SquareStack: () => SquareStack,
  SquareStar: () => SquareStar,
  SquareStop: () => SquareStop,
  SquareTerminal: () => SquareTerminal,
  SquareUser: () => SquareUser,
  SquareUserRound: () => SquareUserRound,
  SquareX: () => SquareX,
  SquaresExclude: () => SquaresExclude,
  SquaresIntersect: () => SquaresIntersect,
  SquaresSubtract: () => SquaresSubtract,
  SquaresUnite: () => SquaresUnite,
  Squircle: () => Squircle,
  SquircleDashed: () => SquircleDashed,
  Squirrel: () => Squirrel,
  Stamp: () => Stamp,
  Star: () => Star,
  StarHalf: () => StarHalf,
  StarOff: () => StarOff,
  Stars: () => Sparkles,
  StepBack: () => StepBack,
  StepForward: () => StepForward,
  Stethoscope: () => Stethoscope,
  Sticker: () => Sticker,
  StickyNote: () => StickyNote,
  StopCircle: () => CircleStop,
  Store: () => Store,
  StretchHorizontal: () => StretchHorizontal,
  StretchVertical: () => StretchVertical,
  Strikethrough: () => Strikethrough,
  Subscript: () => Subscript,
  Subtitles: () => Captions,
  Sun: () => Sun,
  SunDim: () => SunDim,
  SunMedium: () => SunMedium,
  SunMoon: () => SunMoon,
  SunSnow: () => SunSnow,
  Sunrise: () => Sunrise,
  Sunset: () => Sunset,
  Superscript: () => Superscript,
  SwatchBook: () => SwatchBook,
  SwissFranc: () => SwissFranc,
  SwitchCamera: () => SwitchCamera,
  Sword: () => Sword,
  Swords: () => Swords,
  Syringe: () => Syringe,
  Table: () => Table,
  Table2: () => Table2,
  TableCellsMerge: () => TableCellsMerge,
  TableCellsSplit: () => TableCellsSplit,
  TableColumnsSplit: () => TableColumnsSplit,
  TableConfig: () => Columns3Cog,
  TableOfContents: () => TableOfContents,
  TableProperties: () => TableProperties,
  TableRowsSplit: () => TableRowsSplit,
  Tablet: () => Tablet,
  TabletSmartphone: () => TabletSmartphone,
  Tablets: () => Tablets,
  Tag: () => Tag,
  Tags: () => Tags,
  Tally1: () => Tally1,
  Tally2: () => Tally2,
  Tally3: () => Tally3,
  Tally4: () => Tally4,
  Tally5: () => Tally5,
  Tangent: () => Tangent,
  Target: () => Target,
  Telescope: () => Telescope,
  Tent: () => Tent,
  TentTree: () => TentTree,
  Terminal: () => Terminal,
  TerminalSquare: () => SquareTerminal,
  TestTube: () => TestTube,
  TestTube2: () => TestTubeDiagonal,
  TestTubeDiagonal: () => TestTubeDiagonal,
  TestTubes: () => TestTubes,
  Text: () => TextAlignStart,
  TextAlignCenter: () => TextAlignCenter,
  TextAlignEnd: () => TextAlignEnd,
  TextAlignJustify: () => TextAlignJustify,
  TextAlignStart: () => TextAlignStart,
  TextCursor: () => TextCursor,
  TextCursorInput: () => TextCursorInput,
  TextInitial: () => TextInitial,
  TextQuote: () => TextQuote,
  TextSearch: () => TextSearch,
  TextSelect: () => TextSelect,
  TextSelection: () => TextSelect,
  TextWrap: () => TextWrap,
  Theater: () => Theater,
  Thermometer: () => Thermometer,
  ThermometerSnowflake: () => ThermometerSnowflake,
  ThermometerSun: () => ThermometerSun,
  ThumbsDown: () => ThumbsDown,
  ThumbsUp: () => ThumbsUp,
  Ticket: () => Ticket,
  TicketCheck: () => TicketCheck,
  TicketMinus: () => TicketMinus,
  TicketPercent: () => TicketPercent,
  TicketPlus: () => TicketPlus,
  TicketSlash: () => TicketSlash,
  TicketX: () => TicketX,
  Tickets: () => Tickets,
  TicketsPlane: () => TicketsPlane,
  Timer: () => Timer,
  TimerOff: () => TimerOff,
  TimerReset: () => TimerReset,
  ToggleLeft: () => ToggleLeft,
  ToggleRight: () => ToggleRight,
  Toilet: () => Toilet,
  ToolCase: () => ToolCase,
  Tornado: () => Tornado,
  Torus: () => Torus,
  Touchpad: () => Touchpad,
  TouchpadOff: () => TouchpadOff,
  TowerControl: () => TowerControl,
  ToyBrick: () => ToyBrick,
  Tractor: () => Tractor,
  TrafficCone: () => TrafficCone,
  Train: () => TramFront,
  TrainFront: () => TrainFront,
  TrainFrontTunnel: () => TrainFrontTunnel,
  TrainTrack: () => TrainTrack,
  TramFront: () => TramFront,
  Transgender: () => Transgender,
  Trash: () => Trash,
  Trash2: () => Trash2,
  TreeDeciduous: () => TreeDeciduous,
  TreePalm: () => TreePalm,
  TreePine: () => TreePine,
  Trees: () => Trees,
  Trello: () => Trello,
  TrendingDown: () => TrendingDown,
  TrendingUp: () => TrendingUp,
  TrendingUpDown: () => TrendingUpDown,
  Triangle: () => Triangle,
  TriangleAlert: () => TriangleAlert,
  TriangleDashed: () => TriangleDashed,
  TriangleRight: () => TriangleRight,
  Trophy: () => Trophy,
  Truck: () => Truck,
  TruckElectric: () => TruckElectric,
  TurkishLira: () => TurkishLira,
  Turntable: () => Turntable,
  Turtle: () => Turtle,
  Tv: () => Tv,
  Tv2: () => TvMinimal,
  TvMinimal: () => TvMinimal,
  TvMinimalPlay: () => TvMinimalPlay,
  Twitch: () => Twitch,
  Twitter: () => Twitter,
  Type: () => Type,
  TypeOutline: () => TypeOutline,
  Umbrella: () => Umbrella,
  UmbrellaOff: () => UmbrellaOff,
  Underline: () => Underline,
  Undo: () => Undo,
  Undo2: () => Undo2,
  UndoDot: () => UndoDot,
  UnfoldHorizontal: () => UnfoldHorizontal,
  UnfoldVertical: () => UnfoldVertical,
  Ungroup: () => Ungroup,
  University: () => University,
  Unlink: () => Unlink,
  Unlink2: () => Unlink2,
  Unlock: () => LockOpen,
  UnlockKeyhole: () => LockKeyholeOpen,
  Unplug: () => Unplug,
  Upload: () => Upload,
  UploadCloud: () => CloudUpload,
  Usb: () => Usb,
  User: () => User,
  User2: () => UserRound,
  UserCheck: () => UserCheck,
  UserCheck2: () => UserRoundCheck,
  UserCircle: () => CircleUser,
  UserCircle2: () => CircleUserRound,
  UserCog: () => UserCog,
  UserCog2: () => UserRoundCog,
  UserLock: () => UserLock,
  UserMinus: () => UserMinus,
  UserMinus2: () => UserRoundMinus,
  UserPen: () => UserPen,
  UserPlus: () => UserPlus,
  UserPlus2: () => UserRoundPlus,
  UserRound: () => UserRound,
  UserRoundCheck: () => UserRoundCheck,
  UserRoundCog: () => UserRoundCog,
  UserRoundMinus: () => UserRoundMinus,
  UserRoundPen: () => UserRoundPen,
  UserRoundPlus: () => UserRoundPlus,
  UserRoundSearch: () => UserRoundSearch,
  UserRoundX: () => UserRoundX,
  UserSearch: () => UserSearch,
  UserSquare: () => SquareUser,
  UserSquare2: () => SquareUserRound,
  UserStar: () => UserStar,
  UserX: () => UserX,
  UserX2: () => UserRoundX,
  Users: () => Users,
  Users2: () => UsersRound,
  UsersRound: () => UsersRound,
  Utensils: () => Utensils,
  UtensilsCrossed: () => UtensilsCrossed,
  UtilityPole: () => UtilityPole,
  Variable: () => Variable,
  Vault: () => Vault,
  VectorSquare: () => VectorSquare,
  Vegan: () => Vegan,
  VenetianMask: () => VenetianMask,
  Venus: () => Venus,
  VenusAndMars: () => VenusAndMars,
  Verified: () => BadgeCheck,
  Vibrate: () => Vibrate,
  VibrateOff: () => VibrateOff,
  Video: () => Video,
  VideoOff: () => VideoOff,
  Videotape: () => Videotape,
  View: () => View,
  Voicemail: () => Voicemail,
  Volleyball: () => Volleyball,
  Volume: () => Volume,
  Volume1: () => Volume1,
  Volume2: () => Volume2,
  VolumeOff: () => VolumeOff,
  VolumeX: () => VolumeX,
  Vote: () => Vote,
  Wallet: () => Wallet,
  Wallet2: () => WalletMinimal,
  WalletCards: () => WalletCards,
  WalletMinimal: () => WalletMinimal,
  Wallpaper: () => Wallpaper,
  Wand: () => Wand,
  Wand2: () => WandSparkles,
  WandSparkles: () => WandSparkles,
  Warehouse: () => Warehouse,
  WashingMachine: () => WashingMachine,
  Watch: () => Watch,
  Waves: () => Waves,
  WavesLadder: () => WavesLadder,
  Waypoints: () => Waypoints,
  Webcam: () => Webcam,
  Webhook: () => Webhook,
  WebhookOff: () => WebhookOff,
  Weight: () => Weight,
  Wheat: () => Wheat,
  WheatOff: () => WheatOff,
  WholeWord: () => WholeWord,
  Wifi: () => Wifi,
  WifiCog: () => WifiCog,
  WifiHigh: () => WifiHigh,
  WifiLow: () => WifiLow,
  WifiOff: () => WifiOff,
  WifiPen: () => WifiPen,
  WifiSync: () => WifiSync,
  WifiZero: () => WifiZero,
  Wind: () => Wind,
  WindArrowDown: () => WindArrowDown,
  Wine: () => Wine,
  WineOff: () => WineOff,
  Workflow: () => Workflow,
  Worm: () => Worm,
  WrapText: () => TextWrap,
  Wrench: () => Wrench,
  X: () => X,
  XCircle: () => CircleX,
  XOctagon: () => OctagonX,
  XSquare: () => SquareX,
  Youtube: () => Youtube,
  Zap: () => Zap,
  ZapOff: () => ZapOff,
  ZoomIn: () => ZoomIn,
  ZoomOut: () => ZoomOut
});

// node_modules/lucide/dist/esm/icons/a-arrow-down.js
var AArrowDown = [
  ["path", { d: "m14 12 4 4 4-4" }],
  ["path", { d: "M18 16V7" }],
  ["path", { d: "m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" }],
  ["path", { d: "M3.304 13h6.392" }]
];

// node_modules/lucide/dist/esm/icons/a-arrow-up.js
var AArrowUp = [
  ["path", { d: "m14 11 4-4 4 4" }],
  ["path", { d: "M18 16V7" }],
  ["path", { d: "m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" }],
  ["path", { d: "M3.304 13h6.392" }]
];

// node_modules/lucide/dist/esm/icons/a-large-small.js
var ALargeSmall = [
  ["path", { d: "m15 16 2.536-7.328a1.02 1.02 1 0 1 1.928 0L22 16" }],
  ["path", { d: "M15.697 14h5.606" }],
  ["path", { d: "m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" }],
  ["path", { d: "M3.304 13h6.392" }]
];

// node_modules/lucide/dist/esm/icons/accessibility.js
var Accessibility = [
  ["circle", { cx: "16", cy: "4", r: "1" }],
  ["path", { d: "m18 19 1-7-6 1" }],
  ["path", { d: "m5 8 3-3 5.5 3-2.36 3.5" }],
  ["path", { d: "M4.24 14.5a5 5 0 0 0 6.88 6" }],
  ["path", { d: "M13.76 17.5a5 5 0 0 0-6.88-6" }]
];

// node_modules/lucide/dist/esm/icons/activity.js
var Activity = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/air-vent.js
var AirVent = [
  ["path", { d: "M18 17.5a2.5 2.5 0 1 1-4 2.03V12" }],
  ["path", { d: "M6 12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M6 8h12" }],
  ["path", { d: "M6.6 15.572A2 2 0 1 0 10 17v-5" }]
];

// node_modules/lucide/dist/esm/icons/airplay.js
var Airplay = [
  ["path", { d: "M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" }],
  ["path", { d: "m12 15 5 6H7Z" }]
];

// node_modules/lucide/dist/esm/icons/alarm-clock-check.js
var AlarmClockCheck = [
  ["circle", { cx: "12", cy: "13", r: "8" }],
  ["path", { d: "M5 3 2 6" }],
  ["path", { d: "m22 6-3-3" }],
  ["path", { d: "M6.38 18.7 4 21" }],
  ["path", { d: "M17.64 18.67 20 21" }],
  ["path", { d: "m9 13 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/alarm-clock-minus.js
var AlarmClockMinus = [
  ["circle", { cx: "12", cy: "13", r: "8" }],
  ["path", { d: "M5 3 2 6" }],
  ["path", { d: "m22 6-3-3" }],
  ["path", { d: "M6.38 18.7 4 21" }],
  ["path", { d: "M17.64 18.67 20 21" }],
  ["path", { d: "M9 13h6" }]
];

// node_modules/lucide/dist/esm/icons/alarm-clock-off.js
var AlarmClockOff = [
  ["path", { d: "M6.87 6.87a8 8 0 1 0 11.26 11.26" }],
  ["path", { d: "M19.9 14.25a8 8 0 0 0-9.15-9.15" }],
  ["path", { d: "m22 6-3-3" }],
  ["path", { d: "M6.26 18.67 4 21" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M4 4 2 6" }]
];

// node_modules/lucide/dist/esm/icons/alarm-clock-plus.js
var AlarmClockPlus = [
  ["circle", { cx: "12", cy: "13", r: "8" }],
  ["path", { d: "M5 3 2 6" }],
  ["path", { d: "m22 6-3-3" }],
  ["path", { d: "M6.38 18.7 4 21" }],
  ["path", { d: "M17.64 18.67 20 21" }],
  ["path", { d: "M12 10v6" }],
  ["path", { d: "M9 13h6" }]
];

// node_modules/lucide/dist/esm/icons/alarm-clock.js
var AlarmClock = [
  ["circle", { cx: "12", cy: "13", r: "8" }],
  ["path", { d: "M12 9v4l2 2" }],
  ["path", { d: "M5 3 2 6" }],
  ["path", { d: "m22 6-3-3" }],
  ["path", { d: "M6.38 18.7 4 21" }],
  ["path", { d: "M17.64 18.67 20 21" }]
];

// node_modules/lucide/dist/esm/icons/alarm-smoke.js
var AlarmSmoke = [
  ["path", { d: "M11 21c0-2.5 2-2.5 2-5" }],
  ["path", { d: "M16 21c0-2.5 2-2.5 2-5" }],
  ["path", { d: "m19 8-.8 3a1.25 1.25 0 0 1-1.2 1H7a1.25 1.25 0 0 1-1.2-1L5 8" }],
  ["path", { d: "M21 3a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" }],
  ["path", { d: "M6 21c0-2.5 2-2.5 2-5" }]
];

// node_modules/lucide/dist/esm/icons/album.js
var Album = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["polyline", { points: "11 3 11 11 14 8 17 11 17 3" }]
];

// node_modules/lucide/dist/esm/icons/align-center-horizontal.js
var AlignCenterHorizontal = [
  ["path", { d: "M2 12h20" }],
  ["path", { d: "M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" }],
  ["path", { d: "M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1" }],
  ["path", { d: "M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1" }]
];

// node_modules/lucide/dist/esm/icons/align-center-vertical.js
var AlignCenterVertical = [
  ["path", { d: "M12 2v20" }],
  ["path", { d: "M8 10H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h4" }],
  ["path", { d: "M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" }],
  ["path", { d: "M8 20H7a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h1" }],
  ["path", { d: "M16 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1" }]
];

// node_modules/lucide/dist/esm/icons/align-end-horizontal.js
var AlignEndHorizontal = [
  ["rect", { width: "6", height: "16", x: "4", y: "2", rx: "2" }],
  ["rect", { width: "6", height: "9", x: "14", y: "9", rx: "2" }],
  ["path", { d: "M22 22H2" }]
];

// node_modules/lucide/dist/esm/icons/align-end-vertical.js
var AlignEndVertical = [
  ["rect", { width: "16", height: "6", x: "2", y: "4", rx: "2" }],
  ["rect", { width: "9", height: "6", x: "9", y: "14", rx: "2" }],
  ["path", { d: "M22 22V2" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-distribute-center.js
var AlignHorizontalDistributeCenter = [
  ["rect", { width: "6", height: "14", x: "4", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "14", y: "7", rx: "2" }],
  ["path", { d: "M17 22v-5" }],
  ["path", { d: "M17 7V2" }],
  ["path", { d: "M7 22v-3" }],
  ["path", { d: "M7 5V2" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-distribute-end.js
var AlignHorizontalDistributeEnd = [
  ["rect", { width: "6", height: "14", x: "4", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "14", y: "7", rx: "2" }],
  ["path", { d: "M10 2v20" }],
  ["path", { d: "M20 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-distribute-start.js
var AlignHorizontalDistributeStart = [
  ["rect", { width: "6", height: "14", x: "4", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "14", y: "7", rx: "2" }],
  ["path", { d: "M4 2v20" }],
  ["path", { d: "M14 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-justify-center.js
var AlignHorizontalJustifyCenter = [
  ["rect", { width: "6", height: "14", x: "2", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "16", y: "7", rx: "2" }],
  ["path", { d: "M12 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-justify-end.js
var AlignHorizontalJustifyEnd = [
  ["rect", { width: "6", height: "14", x: "2", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "12", y: "7", rx: "2" }],
  ["path", { d: "M22 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-justify-start.js
var AlignHorizontalJustifyStart = [
  ["rect", { width: "6", height: "14", x: "6", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "16", y: "7", rx: "2" }],
  ["path", { d: "M2 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-space-around.js
var AlignHorizontalSpaceAround = [
  ["rect", { width: "6", height: "10", x: "9", y: "7", rx: "2" }],
  ["path", { d: "M4 22V2" }],
  ["path", { d: "M20 22V2" }]
];

// node_modules/lucide/dist/esm/icons/align-horizontal-space-between.js
var AlignHorizontalSpaceBetween = [
  ["rect", { width: "6", height: "14", x: "3", y: "5", rx: "2" }],
  ["rect", { width: "6", height: "10", x: "15", y: "7", rx: "2" }],
  ["path", { d: "M3 2v20" }],
  ["path", { d: "M21 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-start-horizontal.js
var AlignStartHorizontal = [
  ["rect", { width: "6", height: "16", x: "4", y: "6", rx: "2" }],
  ["rect", { width: "6", height: "9", x: "14", y: "6", rx: "2" }],
  ["path", { d: "M22 2H2" }]
];

// node_modules/lucide/dist/esm/icons/align-start-vertical.js
var AlignStartVertical = [
  ["rect", { width: "9", height: "6", x: "6", y: "14", rx: "2" }],
  ["rect", { width: "16", height: "6", x: "6", y: "4", rx: "2" }],
  ["path", { d: "M2 2v20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-distribute-center.js
var AlignVerticalDistributeCenter = [
  ["path", { d: "M22 17h-3" }],
  ["path", { d: "M22 7h-5" }],
  ["path", { d: "M5 17H2" }],
  ["path", { d: "M7 7H2" }],
  ["rect", { x: "5", y: "14", width: "14", height: "6", rx: "2" }],
  ["rect", { x: "7", y: "4", width: "10", height: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-distribute-end.js
var AlignVerticalDistributeEnd = [
  ["rect", { width: "14", height: "6", x: "5", y: "14", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "4", rx: "2" }],
  ["path", { d: "M2 20h20" }],
  ["path", { d: "M2 10h20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-distribute-start.js
var AlignVerticalDistributeStart = [
  ["rect", { width: "14", height: "6", x: "5", y: "14", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "4", rx: "2" }],
  ["path", { d: "M2 14h20" }],
  ["path", { d: "M2 4h20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-justify-center.js
var AlignVerticalJustifyCenter = [
  ["rect", { width: "14", height: "6", x: "5", y: "16", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "2", rx: "2" }],
  ["path", { d: "M2 12h20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-justify-end.js
var AlignVerticalJustifyEnd = [
  ["rect", { width: "14", height: "6", x: "5", y: "12", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "2", rx: "2" }],
  ["path", { d: "M2 22h20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-justify-start.js
var AlignVerticalJustifyStart = [
  ["rect", { width: "14", height: "6", x: "5", y: "16", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "6", rx: "2" }],
  ["path", { d: "M2 2h20" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-space-around.js
var AlignVerticalSpaceAround = [
  ["rect", { width: "10", height: "6", x: "7", y: "9", rx: "2" }],
  ["path", { d: "M22 20H2" }],
  ["path", { d: "M22 4H2" }]
];

// node_modules/lucide/dist/esm/icons/align-vertical-space-between.js
var AlignVerticalSpaceBetween = [
  ["rect", { width: "14", height: "6", x: "5", y: "15", rx: "2" }],
  ["rect", { width: "10", height: "6", x: "7", y: "3", rx: "2" }],
  ["path", { d: "M2 21h20" }],
  ["path", { d: "M2 3h20" }]
];

// node_modules/lucide/dist/esm/icons/ambulance.js
var Ambulance = [
  ["path", { d: "M10 10H6" }],
  ["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }],
  [
    "path",
    {
      d: "M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"
    }
  ],
  ["path", { d: "M8 8v4" }],
  ["path", { d: "M9 18h6" }],
  ["circle", { cx: "17", cy: "18", r: "2" }],
  ["circle", { cx: "7", cy: "18", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/ampersand.js
var Ampersand = [
  [
    "path",
    {
      d: "M17.5 12c0 4.4-3.6 8-8 8A4.5 4.5 0 0 1 5 15.5c0-6 8-4 8-8.5a3 3 0 1 0-6 0c0 3 2.5 8.5 12 13"
    }
  ],
  ["path", { d: "M16 12h3" }]
];

// node_modules/lucide/dist/esm/icons/ampersands.js
var Ampersands = [
  [
    "path",
    { d: "M10 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5" }
  ],
  [
    "path",
    { d: "M22 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5" }
  ]
];

// node_modules/lucide/dist/esm/icons/amphora.js
var Amphora = [
  ["path", { d: "M10 2v5.632c0 .424-.272.795-.653.982A6 6 0 0 0 6 14c.006 4 3 7 5 8" }],
  ["path", { d: "M10 5H8a2 2 0 0 0 0 4h.68" }],
  ["path", { d: "M14 2v5.632c0 .424.272.795.652.982A6 6 0 0 1 18 14c0 4-3 7-5 8" }],
  ["path", { d: "M14 5h2a2 2 0 0 1 0 4h-.68" }],
  ["path", { d: "M18 22H6" }],
  ["path", { d: "M9 2h6" }]
];

// node_modules/lucide/dist/esm/icons/anchor.js
var Anchor = [
  ["path", { d: "M12 22V8" }],
  ["path", { d: "M5 12H2a10 10 0 0 0 20 0h-3" }],
  ["circle", { cx: "12", cy: "5", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/angry.js
var Angry = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M16 16s-1.5-2-4-2-4 2-4 2" }],
  ["path", { d: "M7.5 8 10 9" }],
  ["path", { d: "m14 9 2.5-1" }],
  ["path", { d: "M9 10h.01" }],
  ["path", { d: "M15 10h.01" }]
];

// node_modules/lucide/dist/esm/icons/annoyed.js
var Annoyed = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M8 15h8" }],
  ["path", { d: "M8 9h2" }],
  ["path", { d: "M14 9h2" }]
];

// node_modules/lucide/dist/esm/icons/antenna.js
var Antenna = [
  ["path", { d: "M2 12 7 2" }],
  ["path", { d: "m7 12 5-10" }],
  ["path", { d: "m12 12 5-10" }],
  ["path", { d: "m17 12 5-10" }],
  ["path", { d: "M4.5 7h15" }],
  ["path", { d: "M12 16v6" }]
];

// node_modules/lucide/dist/esm/icons/anvil.js
var Anvil = [
  ["path", { d: "M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4" }],
  ["path", { d: "M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z" }],
  ["path", { d: "M9 12v5" }],
  ["path", { d: "M15 12v5" }],
  ["path", { d: "M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1" }]
];

// node_modules/lucide/dist/esm/icons/aperture.js
var Aperture = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m14.31 8 5.74 9.94" }],
  ["path", { d: "M9.69 8h11.48" }],
  ["path", { d: "m7.38 12 5.74-9.94" }],
  ["path", { d: "M9.69 16 3.95 6.06" }],
  ["path", { d: "M14.31 16H2.83" }],
  ["path", { d: "m16.62 12-5.74 9.94" }]
];

// node_modules/lucide/dist/esm/icons/app-window-mac.js
var AppWindowMac = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M6 8h.01" }],
  ["path", { d: "M10 8h.01" }],
  ["path", { d: "M14 8h.01" }]
];

// node_modules/lucide/dist/esm/icons/app-window.js
var AppWindow = [
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }],
  ["path", { d: "M10 4v4" }],
  ["path", { d: "M2 8h20" }],
  ["path", { d: "M6 4v4" }]
];

// node_modules/lucide/dist/esm/icons/apple.js
var Apple = [
  ["path", { d: "M12 6.528V3a1 1 0 0 1 1-1h0" }],
  [
    "path",
    {
      d: "M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/archive-restore.js
var ArchiveRestore = [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h2" }],
  ["path", { d: "M20 8v11a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "m9 15 3-3 3 3" }],
  ["path", { d: "M12 12v9" }]
];

// node_modules/lucide/dist/esm/icons/archive-x.js
var ArchiveX = [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }],
  ["path", { d: "m9.5 17 5-5" }],
  ["path", { d: "m9.5 12 5 5" }]
];

// node_modules/lucide/dist/esm/icons/archive.js
var Archive = [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }],
  ["path", { d: "M10 12h4" }]
];

// node_modules/lucide/dist/esm/icons/armchair.js
var Armchair = [
  ["path", { d: "M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" }],
  [
    "path",
    {
      d: "M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"
    }
  ],
  ["path", { d: "M5 18v2" }],
  ["path", { d: "M19 18v2" }]
];

// node_modules/lucide/dist/esm/icons/arrow-big-down-dash.js
var ArrowBigDownDash = [
  [
    "path",
    {
      d: "M15 11a1 1 0 0 0 1 1h2.939a1 1 0 0 1 .75 1.811l-6.835 6.836a1.207 1.207 0 0 1-1.707 0L4.31 13.81a1 1 0 0 1 .75-1.811H8a1 1 0 0 0 1-1V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M9 4h6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-big-down.js
var ArrowBigDown = [
  [
    "path",
    {
      d: "M15 11a1 1 0 0 0 1 1h2.939a1 1 0 0 1 .75 1.811l-6.835 6.836a1.207 1.207 0 0 1-1.707 0L4.31 13.81a1 1 0 0 1 .75-1.811H8a1 1 0 0 0 1-1V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/arrow-big-left-dash.js
var ArrowBigLeftDash = [
  [
    "path",
    {
      d: "M13 9a1 1 0 0 1-1-1V5.061a1 1 0 0 0-1.811-.75l-6.835 6.836a1.207 1.207 0 0 0 0 1.707l6.835 6.835a1 1 0 0 0 1.811-.75V16a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"
    }
  ],
  ["path", { d: "M20 9v6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-big-left.js
var ArrowBigLeft = [
  [
    "path",
    {
      d: "M13 9a1 1 0 0 1-1-1V5.061a1 1 0 0 0-1.811-.75l-6.835 6.836a1.207 1.207 0 0 0 0 1.707l6.835 6.835a1 1 0 0 0 1.811-.75V16a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/arrow-big-right-dash.js
var ArrowBigRightDash = [
  [
    "path",
    {
      d: "M11 9a1 1 0 0 0 1-1V5.061a1 1 0 0 1 1.811-.75l6.836 6.836a1.207 1.207 0 0 1 0 1.707l-6.836 6.835a1 1 0 0 1-1.811-.75V16a1 1 0 0 0-1-1H9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"
    }
  ],
  ["path", { d: "M4 9v6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-big-right.js
var ArrowBigRight = [
  [
    "path",
    {
      d: "M11 9a1 1 0 0 0 1-1V5.061a1 1 0 0 1 1.811-.75l6.836 6.836a1.207 1.207 0 0 1 0 1.707l-6.836 6.835a1 1 0 0 1-1.811-.75V16a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/arrow-big-up-dash.js
var ArrowBigUpDash = [
  [
    "path",
    {
      d: "M9 13a1 1 0 0 0-1-1H5.061a1 1 0 0 1-.75-1.811l6.836-6.835a1.207 1.207 0 0 1 1.707 0l6.835 6.835a1 1 0 0 1-.75 1.811H16a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"
    }
  ],
  ["path", { d: "M9 20h6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-big-up.js
var ArrowBigUp = [
  [
    "path",
    {
      d: "M9 13a1 1 0 0 0-1-1H5.061a1 1 0 0 1-.75-1.811l6.836-6.835a1.207 1.207 0 0 1 1.707 0l6.835 6.835a1 1 0 0 1-.75 1.811H16a1 1 0 0 0-1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/arrow-down-0-1.js
var ArrowDown01 = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["rect", { x: "15", y: "4", width: "4", height: "6", ry: "2" }],
  ["path", { d: "M17 20v-6h-2" }],
  ["path", { d: "M15 20h4" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-1-0.js
var ArrowDown10 = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["path", { d: "M17 10V4h-2" }],
  ["path", { d: "M15 10h4" }],
  ["rect", { x: "15", y: "14", width: "4", height: "6", ry: "2" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-a-z.js
var ArrowDownAZ = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["path", { d: "M20 8h-5" }],
  ["path", { d: "M15 10V6.5a2.5 2.5 0 0 1 5 0V10" }],
  ["path", { d: "M15 14h5l-5 6h5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-from-line.js
var ArrowDownFromLine = [
  ["path", { d: "M19 3H5" }],
  ["path", { d: "M12 21V7" }],
  ["path", { d: "m6 15 6 6 6-6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-left.js
var ArrowDownLeft = [
  ["path", { d: "M17 7 7 17" }],
  ["path", { d: "M17 17H7V7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-narrow-wide.js
var ArrowDownNarrowWide = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["path", { d: "M11 4h4" }],
  ["path", { d: "M11 8h7" }],
  ["path", { d: "M11 12h10" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-right.js
var ArrowDownRight = [
  ["path", { d: "m7 7 10 10" }],
  ["path", { d: "M17 7v10H7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-to-dot.js
var ArrowDownToDot = [
  ["path", { d: "M12 2v14" }],
  ["path", { d: "m19 9-7 7-7-7" }],
  ["circle", { cx: "12", cy: "21", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-to-line.js
var ArrowDownToLine = [
  ["path", { d: "M12 17V3" }],
  ["path", { d: "m6 11 6 6 6-6" }],
  ["path", { d: "M19 21H5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-up.js
var ArrowDownUp = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["path", { d: "m21 8-4-4-4 4" }],
  ["path", { d: "M17 4v16" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-wide-narrow.js
var ArrowDownWideNarrow = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 20V4" }],
  ["path", { d: "M11 4h10" }],
  ["path", { d: "M11 8h7" }],
  ["path", { d: "M11 12h4" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down-z-a.js
var ArrowDownZA = [
  ["path", { d: "m3 16 4 4 4-4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M15 4h5l-5 6h5" }],
  ["path", { d: "M15 20v-3.5a2.5 2.5 0 0 1 5 0V20" }],
  ["path", { d: "M20 18h-5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-down.js
var ArrowDown = [
  ["path", { d: "M12 5v14" }],
  ["path", { d: "m19 12-7 7-7-7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-left-right.js
var ArrowLeftRight = [
  ["path", { d: "M8 3 4 7l4 4" }],
  ["path", { d: "M4 7h16" }],
  ["path", { d: "m16 21 4-4-4-4" }],
  ["path", { d: "M20 17H4" }]
];

// node_modules/lucide/dist/esm/icons/arrow-left-from-line.js
var ArrowLeftFromLine = [
  ["path", { d: "m9 6-6 6 6 6" }],
  ["path", { d: "M3 12h14" }],
  ["path", { d: "M21 19V5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-left-to-line.js
var ArrowLeftToLine = [
  ["path", { d: "M3 19V5" }],
  ["path", { d: "m13 6-6 6 6 6" }],
  ["path", { d: "M7 12h14" }]
];

// node_modules/lucide/dist/esm/icons/arrow-left.js
var ArrowLeft = [
  ["path", { d: "m12 19-7-7 7-7" }],
  ["path", { d: "M19 12H5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-right-from-line.js
var ArrowRightFromLine = [
  ["path", { d: "M3 5v14" }],
  ["path", { d: "M21 12H7" }],
  ["path", { d: "m15 18 6-6-6-6" }]
];

// node_modules/lucide/dist/esm/icons/arrow-right-left.js
var ArrowRightLeft = [
  ["path", { d: "m16 3 4 4-4 4" }],
  ["path", { d: "M20 7H4" }],
  ["path", { d: "m8 21-4-4 4-4" }],
  ["path", { d: "M4 17h16" }]
];

// node_modules/lucide/dist/esm/icons/arrow-right-to-line.js
var ArrowRightToLine = [
  ["path", { d: "M17 12H3" }],
  ["path", { d: "m11 18 6-6-6-6" }],
  ["path", { d: "M21 5v14" }]
];

// node_modules/lucide/dist/esm/icons/arrow-right.js
var ArrowRight = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "m12 5 7 7-7 7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-0-1.js
var ArrowUp01 = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["rect", { x: "15", y: "4", width: "4", height: "6", ry: "2" }],
  ["path", { d: "M17 20v-6h-2" }],
  ["path", { d: "M15 20h4" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-1-0.js
var ArrowUp10 = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M17 10V4h-2" }],
  ["path", { d: "M15 10h4" }],
  ["rect", { x: "15", y: "14", width: "4", height: "6", ry: "2" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-a-z.js
var ArrowUpAZ = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M20 8h-5" }],
  ["path", { d: "M15 10V6.5a2.5 2.5 0 0 1 5 0V10" }],
  ["path", { d: "M15 14h5l-5 6h5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-down.js
var ArrowUpDown = [
  ["path", { d: "m21 16-4 4-4-4" }],
  ["path", { d: "M17 20V4" }],
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-from-dot.js
var ArrowUpFromDot = [
  ["path", { d: "m5 9 7-7 7 7" }],
  ["path", { d: "M12 16V2" }],
  ["circle", { cx: "12", cy: "21", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-from-line.js
var ArrowUpFromLine = [
  ["path", { d: "m18 9-6-6-6 6" }],
  ["path", { d: "M12 3v14" }],
  ["path", { d: "M5 21h14" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-left.js
var ArrowUpLeft = [
  ["path", { d: "M7 17V7h10" }],
  ["path", { d: "M17 17 7 7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-narrow-wide.js
var ArrowUpNarrowWide = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M11 12h4" }],
  ["path", { d: "M11 16h7" }],
  ["path", { d: "M11 20h10" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-right.js
var ArrowUpRight = [
  ["path", { d: "M7 7h10v10" }],
  ["path", { d: "M7 17 17 7" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-to-line.js
var ArrowUpToLine = [
  ["path", { d: "M5 3h14" }],
  ["path", { d: "m18 13-6-6-6 6" }],
  ["path", { d: "M12 7v14" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-wide-narrow.js
var ArrowUpWideNarrow = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M11 12h10" }],
  ["path", { d: "M11 16h7" }],
  ["path", { d: "M11 20h4" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up-z-a.js
var ArrowUpZA = [
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
  ["path", { d: "M15 4h5l-5 6h5" }],
  ["path", { d: "M15 20v-3.5a2.5 2.5 0 0 1 5 0V20" }],
  ["path", { d: "M20 18h-5" }]
];

// node_modules/lucide/dist/esm/icons/arrow-up.js
var ArrowUp = [
  ["path", { d: "m5 12 7-7 7 7" }],
  ["path", { d: "M12 19V5" }]
];

// node_modules/lucide/dist/esm/icons/arrows-up-from-line.js
var ArrowsUpFromLine = [
  ["path", { d: "m4 6 3-3 3 3" }],
  ["path", { d: "M7 17V3" }],
  ["path", { d: "m14 6 3-3 3 3" }],
  ["path", { d: "M17 17V3" }],
  ["path", { d: "M4 21h16" }]
];

// node_modules/lucide/dist/esm/icons/asterisk.js
var Asterisk = [
  ["path", { d: "M12 6v12" }],
  ["path", { d: "M17.196 9 6.804 15" }],
  ["path", { d: "m6.804 9 10.392 6" }]
];

// node_modules/lucide/dist/esm/icons/at-sign.js
var AtSign = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" }]
];

// node_modules/lucide/dist/esm/icons/atom.js
var Atom = [
  ["circle", { cx: "12", cy: "12", r: "1" }],
  [
    "path",
    {
      d: "M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"
    }
  ],
  [
    "path",
    {
      d: "M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/audio-lines.js
var AudioLines = [
  ["path", { d: "M2 10v3" }],
  ["path", { d: "M6 6v11" }],
  ["path", { d: "M10 3v18" }],
  ["path", { d: "M14 8v7" }],
  ["path", { d: "M18 5v13" }],
  ["path", { d: "M22 10v3" }]
];

// node_modules/lucide/dist/esm/icons/audio-waveform.js
var AudioWaveform = [
  [
    "path",
    {
      d: "M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/award.js
var Award = [
  [
    "path",
    {
      d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/axe.js
var Axe = [
  ["path", { d: "m14 12-8.381 8.38a1 1 0 0 1-3.001-3L11 9" }],
  [
    "path",
    {
      d: "M15 15.5a.5.5 0 0 0 .5.5A6.5 6.5 0 0 0 22 9.5a.5.5 0 0 0-.5-.5h-1.672a2 2 0 0 1-1.414-.586l-5.062-5.062a1.205 1.205 0 0 0-1.704 0L9.352 5.648a1.205 1.205 0 0 0 0 1.704l5.062 5.062A2 2 0 0 1 15 13.828z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/axis-3d.js
var Axis3d = [
  ["path", { d: "M13.5 10.5 15 9" }],
  ["path", { d: "M4 4v15a1 1 0 0 0 1 1h15" }],
  ["path", { d: "M4.293 19.707 6 18" }],
  ["path", { d: "m9 15 1.5-1.5" }]
];

// node_modules/lucide/dist/esm/icons/baby.js
var Baby = [
  ["path", { d: "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" }],
  ["path", { d: "M15 12h.01" }],
  [
    "path",
    {
      d: "M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"
    }
  ],
  ["path", { d: "M9 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/backpack.js
var Backpack = [
  ["path", { d: "M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" }],
  ["path", { d: "M8 10h8" }],
  ["path", { d: "M8 18h8" }],
  ["path", { d: "M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6" }],
  ["path", { d: "M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" }]
];

// node_modules/lucide/dist/esm/icons/badge-alert.js
var BadgeAlert = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16" }]
];

// node_modules/lucide/dist/esm/icons/badge-cent.js
var BadgeCent = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M12 7v10" }],
  ["path", { d: "M15.4 10a4 4 0 1 0 0 4" }]
];

// node_modules/lucide/dist/esm/icons/badge-check.js
var BadgeCheck = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/badge-dollar-sign.js
var BadgeDollarSign = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }],
  ["path", { d: "M12 18V6" }]
];

// node_modules/lucide/dist/esm/icons/badge-euro.js
var BadgeEuro = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M7 12h5" }],
  ["path", { d: "M15 9.4a4 4 0 1 0 0 5.2" }]
];

// node_modules/lucide/dist/esm/icons/badge-indian-rupee.js
var BadgeIndianRupee = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M8 8h8" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "m13 17-5-1h1a4 4 0 0 0 0-8" }]
];

// node_modules/lucide/dist/esm/icons/badge-info.js
var BadgeInfo = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["line", { x1: "12", x2: "12", y1: "16", y2: "12" }],
  ["line", { x1: "12", x2: "12.01", y1: "8", y2: "8" }]
];

// node_modules/lucide/dist/esm/icons/badge-japanese-yen.js
var BadgeJapaneseYen = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "m9 8 3 3v7" }],
  ["path", { d: "m12 11 3-3" }],
  ["path", { d: "M9 12h6" }],
  ["path", { d: "M9 16h6" }]
];

// node_modules/lucide/dist/esm/icons/badge-minus.js
var BadgeMinus = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/badge-percent.js
var BadgePercent = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "M9 9h.01" }],
  ["path", { d: "M15 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/badge-plus.js
var BadgePlus = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "16" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/badge-pound-sterling.js
var BadgePoundSterling = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M8 12h4" }],
  ["path", { d: "M10 16V9.5a2.5 2.5 0 0 1 5 0" }],
  ["path", { d: "M8 16h7" }]
];

// node_modules/lucide/dist/esm/icons/badge-question-mark.js
var BadgeQuestionMark = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }],
  ["line", { x1: "12", x2: "12.01", y1: "17", y2: "17" }]
];

// node_modules/lucide/dist/esm/icons/badge-russian-ruble.js
var BadgeRussianRuble = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M9 16h5" }],
  ["path", { d: "M9 12h5a2 2 0 1 0 0-4h-3v9" }]
];

// node_modules/lucide/dist/esm/icons/badge-swiss-franc.js
var BadgeSwissFranc = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["path", { d: "M11 17V8h4" }],
  ["path", { d: "M11 12h3" }],
  ["path", { d: "M9 16h4" }]
];

// node_modules/lucide/dist/esm/icons/badge-turkish-lira.js
var BadgeTurkishLira = [
  ["path", { d: "M11 7v10a5 5 0 0 0 5-5" }],
  ["path", { d: "m15 8-6 3" }],
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/badge-x.js
var BadgeX = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ],
  ["line", { x1: "15", x2: "9", y1: "9", y2: "15" }],
  ["line", { x1: "9", x2: "15", y1: "9", y2: "15" }]
];

// node_modules/lucide/dist/esm/icons/badge.js
var Badge = [
  [
    "path",
    {
      d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/baggage-claim.js
var BaggageClaim = [
  ["path", { d: "M22 18H6a2 2 0 0 1-2-2V7a2 2 0 0 0-2-2" }],
  ["path", { d: "M17 14V4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v10" }],
  ["rect", { width: "13", height: "8", x: "8", y: "6", rx: "1" }],
  ["circle", { cx: "18", cy: "20", r: "2" }],
  ["circle", { cx: "9", cy: "20", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/ban.js
var Ban = [
  ["path", { d: "M4.929 4.929 19.07 19.071" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/banana.js
var Banana = [
  ["path", { d: "M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" }],
  [
    "path",
    {
      d: "M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/bandage.js
var Bandage = [
  ["path", { d: "M10 10.01h.01" }],
  ["path", { d: "M10 14.01h.01" }],
  ["path", { d: "M14 10.01h.01" }],
  ["path", { d: "M14 14.01h.01" }],
  ["path", { d: "M18 6v11.5" }],
  ["path", { d: "M6 6v12" }],
  ["rect", { x: "2", y: "6", width: "20", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/banknote-arrow-down.js
var BanknoteArrowDown = [
  ["path", { d: "M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" }],
  ["path", { d: "m16 19 3 3 3-3" }],
  ["path", { d: "M18 12h.01" }],
  ["path", { d: "M19 16v6" }],
  ["path", { d: "M6 12h.01" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/banknote-x.js
var BanknoteX = [
  ["path", { d: "M13 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" }],
  ["path", { d: "m17 17 5 5" }],
  ["path", { d: "M18 12h.01" }],
  ["path", { d: "m22 17-5 5" }],
  ["path", { d: "M6 12h.01" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/banknote-arrow-up.js
var BanknoteArrowUp = [
  ["path", { d: "M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" }],
  ["path", { d: "M18 12h.01" }],
  ["path", { d: "M19 22v-6" }],
  ["path", { d: "m22 19-3-3-3 3" }],
  ["path", { d: "M6 12h.01" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/banknote.js
var Banknote = [
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "M6 12h.01M18 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/barcode.js
var Barcode = [
  ["path", { d: "M3 5v14" }],
  ["path", { d: "M8 5v14" }],
  ["path", { d: "M12 5v14" }],
  ["path", { d: "M17 5v14" }],
  ["path", { d: "M21 5v14" }]
];

// node_modules/lucide/dist/esm/icons/barrel.js
var Barrel = [
  ["path", { d: "M10 3a41 41 0 0 0 0 18" }],
  ["path", { d: "M14 3a41 41 0 0 1 0 18" }],
  [
    "path",
    {
      d: "M17 3a2 2 0 0 1 1.68.92 15.25 15.25 0 0 1 0 16.16A2 2 0 0 1 17 21H7a2 2 0 0 1-1.68-.92 15.25 15.25 0 0 1 0-16.16A2 2 0 0 1 7 3z"
    }
  ],
  ["path", { d: "M3.84 17h16.32" }],
  ["path", { d: "M3.84 7h16.32" }]
];

// node_modules/lucide/dist/esm/icons/baseline.js
var Baseline = [
  ["path", { d: "M4 20h16" }],
  ["path", { d: "m6 16 6-12 6 12" }],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/bath.js
var Bath = [
  ["path", { d: "M10 4 8 6" }],
  ["path", { d: "M17 19v2" }],
  ["path", { d: "M2 12h20" }],
  ["path", { d: "M7 19v2" }],
  ["path", { d: "M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" }]
];

// node_modules/lucide/dist/esm/icons/battery-charging.js
var BatteryCharging = [
  ["path", { d: "m11 7-3 5h4l-3 5" }],
  ["path", { d: "M14.856 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.935" }],
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M5.14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.936" }]
];

// node_modules/lucide/dist/esm/icons/battery-full.js
var BatteryFull = [
  ["path", { d: "M10 10v4" }],
  ["path", { d: "M14 10v4" }],
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M6 10v4" }],
  ["rect", { x: "2", y: "6", width: "16", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/battery-low.js
var BatteryLow = [
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M6 14v-4" }],
  ["rect", { x: "2", y: "6", width: "16", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/battery-plus.js
var BatteryPlus = [
  ["path", { d: "M10 9v6" }],
  ["path", { d: "M12.543 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.605" }],
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M7 12h6" }],
  ["path", { d: "M7.606 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.606" }]
];

// node_modules/lucide/dist/esm/icons/battery-medium.js
var BatteryMedium = [
  ["path", { d: "M10 14v-4" }],
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M6 14v-4" }],
  ["rect", { x: "2", y: "6", width: "16", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/battery-warning.js
var BatteryWarning = [
  ["path", { d: "M10 17h.01" }],
  ["path", { d: "M10 7v6" }],
  ["path", { d: "M14 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M22 14v-4" }],
  ["path", { d: "M6 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" }]
];

// node_modules/lucide/dist/esm/icons/battery.js
var Battery = [
  ["path", { d: "M 22 14 L 22 10" }],
  ["rect", { x: "2", y: "6", width: "16", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/beaker.js
var Beaker = [
  ["path", { d: "M4.5 3h15" }],
  ["path", { d: "M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" }],
  ["path", { d: "M6 14h12" }]
];

// node_modules/lucide/dist/esm/icons/bean-off.js
var BeanOff = [
  ["path", { d: "M9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22a13.96 13.96 0 0 0 9.9-4.1" }],
  ["path", { d: "M10.75 5.093A6 6 0 0 1 22 8c0 2.411-.61 4.68-1.683 6.66" }],
  ["path", { d: "M5.341 10.62a4 4 0 0 0 6.487 1.208M10.62 5.341a4.015 4.015 0 0 1 2.039 2.04" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/bed-double.js
var BedDouble = [
  ["path", { d: "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" }],
  ["path", { d: "M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" }],
  ["path", { d: "M12 4v6" }],
  ["path", { d: "M2 18h20" }]
];

// node_modules/lucide/dist/esm/icons/bean.js
var Bean = [
  [
    "path",
    {
      d: "M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z"
    }
  ],
  ["path", { d: "M5.341 10.62a4 4 0 1 0 5.279-5.28" }]
];

// node_modules/lucide/dist/esm/icons/bed-single.js
var BedSingle = [
  ["path", { d: "M3 20v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" }],
  ["path", { d: "M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" }],
  ["path", { d: "M3 18h18" }]
];

// node_modules/lucide/dist/esm/icons/beef.js
var Beef = [
  [
    "path",
    {
      d: "M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3"
    }
  ],
  [
    "path",
    {
      d: "m18.5 6 2.19 4.5a6.48 6.48 0 0 1-2.29 7.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"
    }
  ],
  ["circle", { cx: "12.5", cy: "8.5", r: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/bed.js
var Bed = [
  ["path", { d: "M2 4v16" }],
  ["path", { d: "M2 8h18a2 2 0 0 1 2 2v10" }],
  ["path", { d: "M2 17h20" }],
  ["path", { d: "M6 8v9" }]
];

// node_modules/lucide/dist/esm/icons/beer-off.js
var BeerOff = [
  ["path", { d: "M13 13v5" }],
  ["path", { d: "M17 11.47V8" }],
  ["path", { d: "M17 11h1a3 3 0 0 1 2.745 4.211" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3" }],
  ["path", { d: "M7.536 7.535C6.766 7.649 6.154 8 5.5 8a2.5 2.5 0 0 1-1.768-4.268" }],
  [
    "path",
    {
      d: "M8.727 3.204C9.306 2.767 9.885 2 11 2c1.56 0 2 1.5 3 1.5s1.72-.5 2.5-.5a1 1 0 1 1 0 5c-.78 0-1.5-.5-2.5-.5a3.149 3.149 0 0 0-.842.12"
    }
  ],
  ["path", { d: "M9 14.6V18" }]
];

// node_modules/lucide/dist/esm/icons/beer.js
var Beer = [
  ["path", { d: "M17 11h1a3 3 0 0 1 0 6h-1" }],
  ["path", { d: "M9 12v6" }],
  ["path", { d: "M13 12v6" }],
  [
    "path",
    {
      d: "M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"
    }
  ],
  ["path", { d: "M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" }]
];

// node_modules/lucide/dist/esm/icons/bell-electric.js
var BellElectric = [
  ["path", { d: "M18.518 17.347A7 7 0 0 1 14 19" }],
  ["path", { d: "M18.8 4A11 11 0 0 1 20 9" }],
  ["path", { d: "M9 9h.01" }],
  ["circle", { cx: "20", cy: "16", r: "2" }],
  ["circle", { cx: "9", cy: "9", r: "7" }],
  ["rect", { x: "4", y: "16", width: "10", height: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/bell-dot.js
var BellDot = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  [
    "path",
    {
      d: "M13.916 2.314A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.74 7.327A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673 9 9 0 0 1-.585-.665"
    }
  ],
  ["circle", { cx: "18", cy: "8", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/bell-minus.js
var BellMinus = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  ["path", { d: "M15 8h6" }],
  [
    "path",
    {
      d: "M16.243 3.757A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673A9.4 9.4 0 0 1 18.667 12"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/bell-off.js
var BellOff = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  ["path", { d: "M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05" }]
];

// node_modules/lucide/dist/esm/icons/bell-plus.js
var BellPlus = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  ["path", { d: "M15 8h6" }],
  ["path", { d: "M18 5v6" }],
  [
    "path",
    {
      d: "M20.002 14.464a9 9 0 0 0 .738.863A1 1 0 0 1 20 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 8.75-5.332"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/bell-ring.js
var BellRing = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  ["path", { d: "M22 8c0-2.3-.8-4.3-2-6" }],
  [
    "path",
    {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
    }
  ],
  ["path", { d: "M4 2C2.8 3.7 2 5.7 2 8" }]
];

// node_modules/lucide/dist/esm/icons/bell.js
var Bell = [
  ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
  [
    "path",
    {
      d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/between-horizontal-end.js
var BetweenHorizontalEnd = [
  ["rect", { width: "13", height: "7", x: "3", y: "3", rx: "1" }],
  ["path", { d: "m22 15-3-3 3-3" }],
  ["rect", { width: "13", height: "7", x: "3", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/between-horizontal-start.js
var BetweenHorizontalStart = [
  ["rect", { width: "13", height: "7", x: "8", y: "3", rx: "1" }],
  ["path", { d: "m2 9 3 3-3 3" }],
  ["rect", { width: "13", height: "7", x: "8", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/between-vertical-end.js
var BetweenVerticalEnd = [
  ["rect", { width: "7", height: "13", x: "3", y: "3", rx: "1" }],
  ["path", { d: "m9 22 3-3 3 3" }],
  ["rect", { width: "7", height: "13", x: "14", y: "3", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/between-vertical-start.js
var BetweenVerticalStart = [
  ["rect", { width: "7", height: "13", x: "3", y: "8", rx: "1" }],
  ["path", { d: "m15 2-3 3-3-3" }],
  ["rect", { width: "7", height: "13", x: "14", y: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/biceps-flexed.js
var BicepsFlexed = [
  [
    "path",
    {
      d: "M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1"
    }
  ],
  ["path", { d: "M15 14a5 5 0 0 0-7.584 2" }],
  ["path", { d: "M9.964 6.825C8.019 7.977 9.5 13 8 15" }]
];

// node_modules/lucide/dist/esm/icons/bike.js
var Bike = [
  ["circle", { cx: "18.5", cy: "17.5", r: "3.5" }],
  ["circle", { cx: "5.5", cy: "17.5", r: "3.5" }],
  ["circle", { cx: "15", cy: "5", r: "1" }],
  ["path", { d: "M12 17.5V14l-3-3 4-3 2 3h2" }]
];

// node_modules/lucide/dist/esm/icons/binary.js
var Binary = [
  ["rect", { x: "14", y: "14", width: "4", height: "6", rx: "2" }],
  ["rect", { x: "6", y: "4", width: "4", height: "6", rx: "2" }],
  ["path", { d: "M6 20h4" }],
  ["path", { d: "M14 10h4" }],
  ["path", { d: "M6 14h2v6" }],
  ["path", { d: "M14 4h2v6" }]
];

// node_modules/lucide/dist/esm/icons/binoculars.js
var Binoculars = [
  ["path", { d: "M10 10h4" }],
  ["path", { d: "M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3" }],
  [
    "path",
    {
      d: "M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z"
    }
  ],
  ["path", { d: "M 22 16 L 2 16" }],
  [
    "path",
    {
      d: "M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z"
    }
  ],
  ["path", { d: "M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3" }]
];

// node_modules/lucide/dist/esm/icons/biohazard.js
var Biohazard = [
  ["circle", { cx: "12", cy: "11.9", r: "2" }],
  ["path", { d: "M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 9 3.7 9.6 2 11.6" }],
  ["path", { d: "m8.9 10.1 1.4.8" }],
  ["path", { d: "M17.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4-1.2 5.2-.6 6.9 1.5" }],
  ["path", { d: "m15.1 10.1-1.4.8" }],
  ["path", { d: "M16.7 20.8c-2.6-.4-4.6-2.6-4.7-5.3-.2 2.6-2.1 4.8-4.7 5.2" }],
  ["path", { d: "M12 13.9v1.6" }],
  ["path", { d: "M13.5 5.4c-1-.2-2-.2-3 0" }],
  ["path", { d: "M17 16.4c.7-.7 1.2-1.6 1.5-2.5" }],
  ["path", { d: "M5.5 13.9c.3.9.8 1.8 1.5 2.5" }]
];

// node_modules/lucide/dist/esm/icons/bird.js
var Bird = [
  ["path", { d: "M16 7h.01" }],
  ["path", { d: "M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" }],
  ["path", { d: "m20 7 2 .5-2 .5" }],
  ["path", { d: "M10 18v3" }],
  ["path", { d: "M14 17.75V21" }],
  ["path", { d: "M7 18a6 6 0 0 0 3.84-10.61" }]
];

// node_modules/lucide/dist/esm/icons/birdhouse.js
var Birdhouse = [
  ["path", { d: "M12 18v4" }],
  ["path", { d: "m17 18 1.956-11.468" }],
  ["path", { d: "m3 8 7.82-5.615a2 2 0 0 1 2.36 0L21 8" }],
  ["path", { d: "M4 18h16" }],
  ["path", { d: "M7 18 5.044 6.532" }],
  ["circle", { cx: "12", cy: "10", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/blend.js
var Blend = [
  ["circle", { cx: "9", cy: "9", r: "7" }],
  ["circle", { cx: "15", cy: "15", r: "7" }]
];

// node_modules/lucide/dist/esm/icons/blinds.js
var Blinds = [
  ["path", { d: "M3 3h18" }],
  ["path", { d: "M20 7H8" }],
  ["path", { d: "M20 11H8" }],
  ["path", { d: "M10 19h10" }],
  ["path", { d: "M8 15h12" }],
  ["path", { d: "M4 3v14" }],
  ["circle", { cx: "4", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/bitcoin.js
var Bitcoin = [
  [
    "path",
    {
      d: "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/blocks.js
var Blocks = [
  [
    "path",
    {
      d: "M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"
    }
  ],
  ["rect", { x: "14", y: "2", width: "8", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/bluetooth-connected.js
var BluetoothConnected = [
  ["path", { d: "m7 7 10 10-5 5V2l5 5L7 17" }],
  ["line", { x1: "18", x2: "21", y1: "12", y2: "12" }],
  ["line", { x1: "3", x2: "6", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/bluetooth-off.js
var BluetoothOff = [
  ["path", { d: "m17 17-5 5V12l-5 5" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M14.5 9.5 17 7l-5-5v4.5" }]
];

// node_modules/lucide/dist/esm/icons/bluetooth.js
var Bluetooth = [["path", { d: "m7 7 10 10-5 5V2l5 5L7 17" }]];

// node_modules/lucide/dist/esm/icons/bold.js
var Bold = [
  ["path", { d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" }]
];

// node_modules/lucide/dist/esm/icons/bluetooth-searching.js
var BluetoothSearching = [
  ["path", { d: "m7 7 10 10-5 5V2l5 5L7 17" }],
  ["path", { d: "M20.83 14.83a4 4 0 0 0 0-5.66" }],
  ["path", { d: "M18 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/bolt.js
var Bolt = [
  [
    "path",
    {
      d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/bomb.js
var Bomb = [
  ["circle", { cx: "11", cy: "13", r: "9" }],
  [
    "path",
    { d: "M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95" }
  ],
  ["path", { d: "m22 2-1.5 1.5" }]
];

// node_modules/lucide/dist/esm/icons/bone.js
var Bone = [
  [
    "path",
    {
      d: "M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/book-a.js
var BookA = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "m8 13 4-7 4 7" }],
  ["path", { d: "M9.1 11h5.7" }]
];

// node_modules/lucide/dist/esm/icons/book-alert.js
var BookAlert = [
  ["path", { d: "M12 13h.01" }],
  ["path", { d: "M12 6v3" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ]
];

// node_modules/lucide/dist/esm/icons/book-audio.js
var BookAudio = [
  ["path", { d: "M12 6v7" }],
  ["path", { d: "M16 8v3" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "M8 8v3" }]
];

// node_modules/lucide/dist/esm/icons/book-check.js
var BookCheck = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "m9 9.5 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/book-copy.js
var BookCopy = [
  ["path", { d: "M5 7a2 2 0 0 0-2 2v11" }],
  ["path", { d: "M5.803 18H5a2 2 0 0 0 0 4h9.5a.5.5 0 0 0 .5-.5V21" }],
  [
    "path",
    { d: "M9 15V4a2 2 0 0 1 2-2h9.5a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H11a2 2 0 0 1 0-4h10" }
  ]
];

// node_modules/lucide/dist/esm/icons/book-dashed.js
var BookDashed = [
  ["path", { d: "M12 17h1.5" }],
  ["path", { d: "M12 22h1.5" }],
  ["path", { d: "M12 2h1.5" }],
  ["path", { d: "M17.5 22H19a1 1 0 0 0 1-1" }],
  ["path", { d: "M17.5 2H19a1 1 0 0 1 1 1v1.5" }],
  ["path", { d: "M20 14v3h-2.5" }],
  ["path", { d: "M20 8.5V10" }],
  ["path", { d: "M4 10V8.5" }],
  ["path", { d: "M4 19.5V14" }],
  ["path", { d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H8" }],
  ["path", { d: "M8 22H6.5a1 1 0 0 1 0-5H8" }]
];

// node_modules/lucide/dist/esm/icons/book-headphones.js
var BookHeadphones = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "M8 12v-2a4 4 0 0 1 8 0v2" }],
  ["circle", { cx: "15", cy: "12", r: "1" }],
  ["circle", { cx: "9", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/book-down.js
var BookDown = [
  ["path", { d: "M12 13V7" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "m9 10 3 3 3-3" }]
];

// node_modules/lucide/dist/esm/icons/book-heart.js
var BookHeart = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  [
    "path",
    {
      d: "M8.62 9.8A2.25 2.25 0 1 1 12 6.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/book-image.js
var BookImage = [
  ["path", { d: "m20 13.7-2.1-2.1a2 2 0 0 0-2.8 0L9.7 17" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["circle", { cx: "10", cy: "8", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/book-key.js
var BookKey = [
  ["path", { d: "m19 3 1 1" }],
  ["path", { d: "m20 2-4.5 4.5" }],
  ["path", { d: "M20 7.898V21a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }],
  ["path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2h7.844" }],
  ["circle", { cx: "14", cy: "8", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/book-lock.js
var BookLock = [
  ["path", { d: "M18 6V4a2 2 0 1 0-4 0v2" }],
  ["path", { d: "M20 15v6a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }],
  ["path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H10" }],
  ["rect", { x: "12", y: "6", width: "8", height: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/book-marked.js
var BookMarked = [
  ["path", { d: "M10 2v8l3-3 3 3V2" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ]
];

// node_modules/lucide/dist/esm/icons/book-minus.js
var BookMinus = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "M9 10h6" }]
];

// node_modules/lucide/dist/esm/icons/book-open-check.js
var BookOpenCheck = [
  ["path", { d: "M12 21V7" }],
  ["path", { d: "m16 12 2 2 4-4" }],
  [
    "path",
    {
      d: "M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/book-open-text.js
var BookOpenText = [
  ["path", { d: "M12 7v14" }],
  ["path", { d: "M16 12h2" }],
  ["path", { d: "M16 8h2" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
    }
  ],
  ["path", { d: "M6 12h2" }],
  ["path", { d: "M6 8h2" }]
];

// node_modules/lucide/dist/esm/icons/book-open.js
var BookOpen = [
  ["path", { d: "M12 7v14" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/book-plus.js
var BookPlus = [
  ["path", { d: "M12 7v6" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "M9 10h6" }]
];

// node_modules/lucide/dist/esm/icons/book-text.js
var BookText = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "M8 11h8" }],
  ["path", { d: "M8 7h6" }]
];

// node_modules/lucide/dist/esm/icons/book-type.js
var BookType = [
  ["path", { d: "M10 13h4" }],
  ["path", { d: "M12 6v7" }],
  ["path", { d: "M16 8V6H8v2" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ]
];

// node_modules/lucide/dist/esm/icons/book-up-2.js
var BookUp2 = [
  ["path", { d: "M12 13V7" }],
  ["path", { d: "M18 2h1a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }],
  ["path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2" }],
  ["path", { d: "m9 10 3-3 3 3" }],
  ["path", { d: "m9 5 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/book-up.js
var BookUp = [
  ["path", { d: "M12 13V7" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "m9 10 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/book-user.js
var BookUser = [
  ["path", { d: "M15 13a3 3 0 1 0-6 0" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["circle", { cx: "12", cy: "8", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/book-x.js
var BookX = [
  ["path", { d: "m14.5 7-5 5" }],
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ],
  ["path", { d: "m9.5 7 5 5" }]
];

// node_modules/lucide/dist/esm/icons/book.js
var Book = [
  [
    "path",
    { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" }
  ]
];

// node_modules/lucide/dist/esm/icons/bookmark-check.js
var BookmarkCheck = [
  ["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" }],
  ["path", { d: "m9 10 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/bookmark-minus.js
var BookmarkMinus = [
  ["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }],
  ["line", { x1: "15", x2: "9", y1: "10", y2: "10" }]
];

// node_modules/lucide/dist/esm/icons/bookmark-plus.js
var BookmarkPlus = [
  ["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }],
  ["line", { x1: "12", x2: "12", y1: "7", y2: "13" }],
  ["line", { x1: "15", x2: "9", y1: "10", y2: "10" }]
];

// node_modules/lucide/dist/esm/icons/bookmark-x.js
var BookmarkX = [
  ["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" }],
  ["path", { d: "m14.5 7.5-5 5" }],
  ["path", { d: "m9.5 7.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/bookmark.js
var Bookmark = [["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }]];

// node_modules/lucide/dist/esm/icons/bot-message-square.js
var BotMessageSquare = [
  ["path", { d: "M12 6V2H8" }],
  ["path", { d: "M15 11v2" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M20 12h2" }],
  [
    "path",
    {
      d: "M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M9 11v2" }]
];

// node_modules/lucide/dist/esm/icons/boom-box.js
var BoomBox = [
  ["path", { d: "M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" }],
  ["path", { d: "M8 8v1" }],
  ["path", { d: "M12 8v1" }],
  ["path", { d: "M16 8v1" }],
  ["rect", { width: "20", height: "12", x: "2", y: "9", rx: "2" }],
  ["circle", { cx: "8", cy: "15", r: "2" }],
  ["circle", { cx: "16", cy: "15", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/bot-off.js
var BotOff = [
  ["path", { d: "M13.67 8H18a2 2 0 0 1 2 2v4.33" }],
  ["path", { d: "M2 14h2" }],
  ["path", { d: "M20 14h2" }],
  ["path", { d: "M22 22 2 2" }],
  ["path", { d: "M8 8H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 1.414-.586" }],
  ["path", { d: "M9 13v2" }],
  ["path", { d: "M9.67 4H12v2.33" }]
];

// node_modules/lucide/dist/esm/icons/bot.js
var Bot = [
  ["path", { d: "M12 8V4H8" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2" }],
  ["path", { d: "M2 14h2" }],
  ["path", { d: "M20 14h2" }],
  ["path", { d: "M15 13v2" }],
  ["path", { d: "M9 13v2" }]
];

// node_modules/lucide/dist/esm/icons/bottle-wine.js
var BottleWine = [
  [
    "path",
    {
      d: "M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a6 6 0 0 0 1.2 3.6l.6.8A6 6 0 0 1 17 13v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a6 6 0 0 1 1.2-3.6l.6-.8A6 6 0 0 0 10 5z"
    }
  ],
  ["path", { d: "M17 13h-4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h4" }]
];

// node_modules/lucide/dist/esm/icons/bow-arrow.js
var BowArrow = [
  ["path", { d: "M17 3h4v4" }],
  ["path", { d: "M18.575 11.082a13 13 0 0 1 1.048 9.027 1.17 1.17 0 0 1-1.914.597L14 17" }],
  ["path", { d: "M7 10 3.29 6.29a1.17 1.17 0 0 1 .6-1.91 13 13 0 0 1 9.03 1.05" }],
  [
    "path",
    {
      d: "M7 14a1.7 1.7 0 0 0-1.207.5l-2.646 2.646A.5.5 0 0 0 3.5 18H5a1 1 0 0 1 1 1v1.5a.5.5 0 0 0 .854.354L9.5 18.207A1.7 1.7 0 0 0 10 17v-2a1 1 0 0 0-1-1z"
    }
  ],
  ["path", { d: "M9.707 14.293 21 3" }]
];

// node_modules/lucide/dist/esm/icons/box.js
var Box = [
  [
    "path",
    {
      d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
    }
  ],
  ["path", { d: "m3.3 7 8.7 5 8.7-5" }],
  ["path", { d: "M12 22V12" }]
];

// node_modules/lucide/dist/esm/icons/boxes.js
var Boxes = [
  [
    "path",
    {
      d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"
    }
  ],
  ["path", { d: "m7 16.5-4.74-2.85" }],
  ["path", { d: "m7 16.5 5-3" }],
  ["path", { d: "M7 16.5v5.17" }],
  [
    "path",
    {
      d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"
    }
  ],
  ["path", { d: "m17 16.5-5-3" }],
  ["path", { d: "m17 16.5 4.74-2.85" }],
  ["path", { d: "M17 16.5v5.17" }],
  [
    "path",
    {
      d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"
    }
  ],
  ["path", { d: "M12 8 7.26 5.15" }],
  ["path", { d: "m12 8 4.74-2.85" }],
  ["path", { d: "M12 13.5V8" }]
];

// node_modules/lucide/dist/esm/icons/braces.js
var Braces = [
  ["path", { d: "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" }],
  ["path", { d: "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" }]
];

// node_modules/lucide/dist/esm/icons/brackets.js
var Brackets = [
  ["path", { d: "M16 3h3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-3" }],
  ["path", { d: "M8 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3" }]
];

// node_modules/lucide/dist/esm/icons/brain-circuit.js
var BrainCircuit = [
  [
    "path",
    { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }
  ],
  ["path", { d: "M9 13a4.5 4.5 0 0 0 3-4" }],
  ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }],
  ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }],
  ["path", { d: "M6 18a4 4 0 0 1-1.967-.516" }],
  ["path", { d: "M12 13h4" }],
  ["path", { d: "M12 18h6a2 2 0 0 1 2 2v1" }],
  ["path", { d: "M12 8h8" }],
  ["path", { d: "M16 8V5a2 2 0 0 1 2-2" }],
  ["circle", { cx: "16", cy: "13", r: ".5" }],
  ["circle", { cx: "18", cy: "3", r: ".5" }],
  ["circle", { cx: "20", cy: "21", r: ".5" }],
  ["circle", { cx: "20", cy: "8", r: ".5" }]
];

// node_modules/lucide/dist/esm/icons/brain-cog.js
var BrainCog = [
  ["path", { d: "m10.852 14.772-.383.923" }],
  ["path", { d: "m10.852 9.228-.383-.923" }],
  ["path", { d: "m13.148 14.772.382.924" }],
  ["path", { d: "m13.531 8.305-.383.923" }],
  ["path", { d: "m14.772 10.852.923-.383" }],
  ["path", { d: "m14.772 13.148.923.383" }],
  [
    "path",
    {
      d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771"
    }
  ],
  ["path", { d: "M17.998 5.125a4 4 0 0 1 2.525 5.771" }],
  ["path", { d: "M19.505 10.294a4 4 0 0 1-1.5 7.706" }],
  [
    "path",
    { d: "M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516" }
  ],
  ["path", { d: "M4.5 10.291A4 4 0 0 0 6 18" }],
  ["path", { d: "M6.002 5.125a3 3 0 0 0 .4 1.375" }],
  ["path", { d: "m9.228 10.852-.923-.383" }],
  ["path", { d: "m9.228 13.148-.923.383" }],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/brain.js
var Brain = [
  ["path", { d: "M12 18V5" }],
  ["path", { d: "M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" }],
  ["path", { d: "M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" }],
  ["path", { d: "M17.997 5.125a4 4 0 0 1 2.526 5.77" }],
  ["path", { d: "M18 18a4 4 0 0 0 2-7.464" }],
  ["path", { d: "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" }],
  ["path", { d: "M6 18a4 4 0 0 1-2-7.464" }],
  ["path", { d: "M6.003 5.125a4 4 0 0 0-2.526 5.77" }]
];

// node_modules/lucide/dist/esm/icons/brick-wall-fire.js
var BrickWallFire = [
  ["path", { d: "M16 3v2.107" }],
  [
    "path",
    {
      d: "M17 9c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 22 17a5 5 0 0 1-10 0c0-.3 0-.6.1-.9a2 2 0 1 0 3.3-2C13 11.5 16 9 17 9"
    }
  ],
  ["path", { d: "M21 8.274V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.938" }],
  ["path", { d: "M3 15h5.253" }],
  ["path", { d: "M3 9h8.228" }],
  ["path", { d: "M8 15v6" }],
  ["path", { d: "M8 3v6" }]
];

// node_modules/lucide/dist/esm/icons/brick-wall-shield.js
var BrickWallShield = [
  ["path", { d: "M12 9v1.258" }],
  ["path", { d: "M16 3v5.46" }],
  ["path", { d: "M21 9.118V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5.75" }],
  [
    "path",
    {
      d: "M22 17.5c0 2.499-1.75 3.749-3.83 4.474a.5.5 0 0 1-.335-.005c-2.085-.72-3.835-1.97-3.835-4.47V14a.5.5 0 0 1 .5-.499c1 0 2.25-.6 3.12-1.36a.6.6 0 0 1 .76-.001c.875.765 2.12 1.36 3.12 1.36a.5.5 0 0 1 .5.5z"
    }
  ],
  ["path", { d: "M3 15h7" }],
  ["path", { d: "M3 9h12.142" }],
  ["path", { d: "M8 15v6" }],
  ["path", { d: "M8 3v6" }]
];

// node_modules/lucide/dist/esm/icons/brick-wall.js
var BrickWall = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M12 9v6" }],
  ["path", { d: "M16 15v6" }],
  ["path", { d: "M16 3v6" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "M8 15v6" }],
  ["path", { d: "M8 3v6" }]
];

// node_modules/lucide/dist/esm/icons/briefcase-business.js
var BriefcaseBusiness = [
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" }],
  ["path", { d: "M22 13a18.15 18.15 0 0 1-20 0" }],
  ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/briefcase-conveyor-belt.js
var BriefcaseConveyorBelt = [
  ["path", { d: "M10 20v2" }],
  ["path", { d: "M14 20v2" }],
  ["path", { d: "M18 20v2" }],
  ["path", { d: "M21 20H3" }],
  ["path", { d: "M6 20v2" }],
  ["path", { d: "M8 16V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12" }],
  ["rect", { x: "4", y: "6", width: "16", height: "10", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/briefcase-medical.js
var BriefcaseMedical = [
  ["path", { d: "M12 11v4" }],
  ["path", { d: "M14 13h-4" }],
  ["path", { d: "M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" }],
  ["path", { d: "M18 6v14" }],
  ["path", { d: "M6 6v14" }],
  ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/briefcase.js
var Briefcase = [
  ["path", { d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" }],
  ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/bring-to-front.js
var BringToFront = [
  ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "2" }],
  ["path", { d: "M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" }],
  ["path", { d: "M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2" }]
];

// node_modules/lucide/dist/esm/icons/brush-cleaning.js
var BrushCleaning = [
  ["path", { d: "m16 22-1-4" }],
  [
    "path",
    {
      d: "M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1"
    }
  ],
  ["path", { d: "M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z" }],
  ["path", { d: "m8 22 1-4" }]
];

// node_modules/lucide/dist/esm/icons/brush.js
var Brush = [
  ["path", { d: "m11 10 3 3" }],
  ["path", { d: "M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z" }],
  ["path", { d: "M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031" }]
];

// node_modules/lucide/dist/esm/icons/bubbles.js
var Bubbles = [
  ["path", { d: "M7.2 14.8a2 2 0 0 1 2 2" }],
  ["circle", { cx: "18.5", cy: "8.5", r: "3.5" }],
  ["circle", { cx: "7.5", cy: "16.5", r: "5.5" }],
  ["circle", { cx: "7.5", cy: "4.5", r: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/bug-off.js
var BugOff = [
  ["path", { d: "M12 20v-8" }],
  ["path", { d: "M14.12 3.88 16 2" }],
  ["path", { d: "M15 7.13V6a3 3 0 0 0-5.14-2.1L8 2" }],
  ["path", { d: "M18 12.34V11a4 4 0 0 0-4-4h-1.3" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M21 5a4 4 0 0 1-3.55 3.97" }],
  ["path", { d: "M22 13h-3.34" }],
  ["path", { d: "M3 21a4 4 0 0 1 3.81-4" }],
  ["path", { d: "M6 13H2" }],
  ["path", { d: "M7.7 7.7A4 4 0 0 0 6 11v3a6 6 0 0 0 11.13 3.13" }]
];

// node_modules/lucide/dist/esm/icons/bug-play.js
var BugPlay = [
  ["path", { d: "M10 19.655A6 6 0 0 1 6 14v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 3.97" }],
  [
    "path",
    {
      d: "M14 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"
    }
  ],
  ["path", { d: "M14.12 3.88 16 2" }],
  ["path", { d: "M21 5a4 4 0 0 1-3.55 3.97" }],
  ["path", { d: "M3 21a4 4 0 0 1 3.81-4" }],
  ["path", { d: "M3 5a4 4 0 0 0 3.55 3.97" }],
  ["path", { d: "M6 13H2" }],
  ["path", { d: "m8 2 1.88 1.88" }],
  ["path", { d: "M9 7.13V6a3 3 0 1 1 6 0v1.13" }]
];

// node_modules/lucide/dist/esm/icons/bug.js
var Bug = [
  ["path", { d: "M12 20v-9" }],
  ["path", { d: "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" }],
  ["path", { d: "M14.12 3.88 16 2" }],
  ["path", { d: "M21 21a4 4 0 0 0-3.81-4" }],
  ["path", { d: "M21 5a4 4 0 0 1-3.55 3.97" }],
  ["path", { d: "M22 13h-4" }],
  ["path", { d: "M3 21a4 4 0 0 1 3.81-4" }],
  ["path", { d: "M3 5a4 4 0 0 0 3.55 3.97" }],
  ["path", { d: "M6 13H2" }],
  ["path", { d: "m8 2 1.88 1.88" }],
  ["path", { d: "M9 7.13V6a3 3 0 1 1 6 0v1.13" }]
];

// node_modules/lucide/dist/esm/icons/building-2.js
var Building2 = [
  ["path", { d: "M10 12h4" }],
  ["path", { d: "M10 8h4" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
  ["path", { d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" }],
  ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }]
];

// node_modules/lucide/dist/esm/icons/building.js
var Building = [
  ["path", { d: "M12 10h.01" }],
  ["path", { d: "M12 14h.01" }],
  ["path", { d: "M12 6h.01" }],
  ["path", { d: "M16 10h.01" }],
  ["path", { d: "M16 14h.01" }],
  ["path", { d: "M16 6h.01" }],
  ["path", { d: "M8 10h.01" }],
  ["path", { d: "M8 14h.01" }],
  ["path", { d: "M8 6h.01" }],
  ["path", { d: "M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" }],
  ["rect", { x: "4", y: "2", width: "16", height: "20", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/bus-front.js
var BusFront = [
  ["path", { d: "M4 6 2 7" }],
  ["path", { d: "M10 6h4" }],
  ["path", { d: "m22 7-2-1" }],
  ["rect", { width: "16", height: "16", x: "4", y: "3", rx: "2" }],
  ["path", { d: "M4 11h16" }],
  ["path", { d: "M8 15h.01" }],
  ["path", { d: "M16 15h.01" }],
  ["path", { d: "M6 19v2" }],
  ["path", { d: "M18 21v-2" }]
];

// node_modules/lucide/dist/esm/icons/bus.js
var Bus = [
  ["path", { d: "M8 6v6" }],
  ["path", { d: "M15 6v6" }],
  ["path", { d: "M2 12h19.6" }],
  [
    "path",
    {
      d: "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"
    }
  ],
  ["circle", { cx: "7", cy: "18", r: "2" }],
  ["path", { d: "M9 18h5" }],
  ["circle", { cx: "16", cy: "18", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/cable-car.js
var CableCar = [
  ["path", { d: "M10 3h.01" }],
  ["path", { d: "M14 2h.01" }],
  ["path", { d: "m2 9 20-5" }],
  ["path", { d: "M12 12V6.5" }],
  ["rect", { width: "16", height: "10", x: "4", y: "12", rx: "3" }],
  ["path", { d: "M9 12v5" }],
  ["path", { d: "M15 12v5" }],
  ["path", { d: "M4 17h16" }]
];

// node_modules/lucide/dist/esm/icons/cable.js
var Cable = [
  ["path", { d: "M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z" }],
  ["path", { d: "M17 21v-2" }],
  ["path", { d: "M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10" }],
  ["path", { d: "M21 21v-2" }],
  ["path", { d: "M3 5V3" }],
  ["path", { d: "M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z" }],
  ["path", { d: "M7 5V3" }]
];

// node_modules/lucide/dist/esm/icons/cake-slice.js
var CakeSlice = [
  ["path", { d: "M16 13H3" }],
  ["path", { d: "M16 17H3" }],
  [
    "path",
    {
      d: "m7.2 7.9-3.388 2.5A2 2 0 0 0 3 12.01V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8.654c0-2-2.44-6.026-6.44-8.026a1 1 0 0 0-1.082.057L10.4 5.6"
    }
  ],
  ["circle", { cx: "9", cy: "7", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/cake.js
var Cake = [
  ["path", { d: "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" }],
  ["path", { d: "M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" }],
  ["path", { d: "M2 21h20" }],
  ["path", { d: "M7 8v3" }],
  ["path", { d: "M12 8v3" }],
  ["path", { d: "M17 8v3" }],
  ["path", { d: "M7 4h.01" }],
  ["path", { d: "M12 4h.01" }],
  ["path", { d: "M17 4h.01" }]
];

// node_modules/lucide/dist/esm/icons/calculator.js
var Calculator = [
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2" }],
  ["line", { x1: "8", x2: "16", y1: "6", y2: "6" }],
  ["line", { x1: "16", x2: "16", y1: "14", y2: "18" }],
  ["path", { d: "M16 10h.01" }],
  ["path", { d: "M12 10h.01" }],
  ["path", { d: "M8 10h.01" }],
  ["path", { d: "M12 14h.01" }],
  ["path", { d: "M8 14h.01" }],
  ["path", { d: "M12 18h.01" }],
  ["path", { d: "M8 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/calendar-1.js
var Calendar1 = [
  ["path", { d: "M11 14h1v4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }],
  ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/calendar-arrow-down.js
var CalendarArrowDown = [
  ["path", { d: "m14 18 4 4 4-4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M18 14v8" }],
  ["path", { d: "M21 11.354V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.343" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-arrow-up.js
var CalendarArrowUp = [
  ["path", { d: "m14 18 4-4 4 4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M18 22v-8" }],
  ["path", { d: "M21 11.343V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-check-2.js
var CalendarCheck2 = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "m16 20 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-check.js
var CalendarCheck = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "m9 16 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-clock.js
var CalendarClock = [
  ["path", { d: "M16 14v2.2l1.6 1" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" }],
  ["path", { d: "M3 10h5" }],
  ["path", { d: "M8 2v4" }],
  ["circle", { cx: "16", cy: "16", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/calendar-cog.js
var CalendarCog = [
  ["path", { d: "m15.228 16.852-.923-.383" }],
  ["path", { d: "m15.228 19.148-.923.383" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "m16.47 14.305.382.923" }],
  ["path", { d: "m16.852 20.772-.383.924" }],
  ["path", { d: "m19.148 15.228.383-.923" }],
  ["path", { d: "m19.53 21.696-.382-.924" }],
  ["path", { d: "m20.772 16.852.924-.383" }],
  ["path", { d: "m20.772 19.148.924.383" }],
  ["path", { d: "M21 10.592V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/calendar-days.js
var CalendarDays = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 14h.01" }],
  ["path", { d: "M12 14h.01" }],
  ["path", { d: "M16 14h.01" }],
  ["path", { d: "M8 18h.01" }],
  ["path", { d: "M12 18h.01" }],
  ["path", { d: "M16 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/calendar-fold.js
var CalendarFold = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 17V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11Z" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M15 22v-4a2 2 0 0 1 2-2h4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-heart.js
var CalendarHeart = [
  ["path", { d: "M12.127 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.125" }],
  [
    "path",
    {
      d: "M14.62 18.8A2.25 2.25 0 1 1 18 15.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
    }
  ],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-minus-2.js
var CalendarMinus2 = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M10 16h4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-minus.js
var CalendarMinus = [
  ["path", { d: "M16 19h6" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.5" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-off.js
var CalendarOff = [
  ["path", { d: "M4.2 4.2A2 2 0 0 0 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.82-1.18" }],
  ["path", { d: "M21 15.5V6a2 2 0 0 0-2-2H9.5" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M3 10h7" }],
  ["path", { d: "M21 10h-5.5" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/calendar-plus-2.js
var CalendarPlus2 = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M10 16h4" }],
  ["path", { d: "M12 14v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-plus.js
var CalendarPlus = [
  ["path", { d: "M16 19h6" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M19 16v6" }],
  ["path", { d: "M21 12.598V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.5" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-range.js
var CalendarRange = [
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M17 14h-6" }],
  ["path", { d: "M13 18H7" }],
  ["path", { d: "M7 14h.01" }],
  ["path", { d: "M17 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/calendar-search.js
var CalendarSearch = [
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 11.75V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.25" }],
  ["path", { d: "m22 22-1.875-1.875" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "M8 2v4" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/calendar-sync.js
var CalendarSync = [
  ["path", { d: "M11 10v4h4" }],
  ["path", { d: "m11 14 1.535-1.605a5 5 0 0 1 8 1.5" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "m21 18-1.535 1.605a5 5 0 0 1-8-1.5" }],
  ["path", { d: "M21 22v-4h-4" }],
  ["path", { d: "M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4.3" }],
  ["path", { d: "M3 10h4" }],
  ["path", { d: "M8 2v4" }]
];

// node_modules/lucide/dist/esm/icons/calendar-x-2.js
var CalendarX2 = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "m17 22 5-5" }],
  ["path", { d: "m17 17 5 5" }]
];

// node_modules/lucide/dist/esm/icons/calendar-x.js
var CalendarX = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }],
  ["path", { d: "m14 14-4 4" }],
  ["path", { d: "m10 14 4 4" }]
];

// node_modules/lucide/dist/esm/icons/calendar.js
var Calendar = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
  ["path", { d: "M3 10h18" }]
];

// node_modules/lucide/dist/esm/icons/camera.js
var Camera = [
  [
    "path",
    {
      d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/camera-off.js
var CameraOff = [
  ["path", { d: "M14.564 14.558a3 3 0 1 1-4.122-4.121" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 .819-.175" }],
  [
    "path",
    {
      d: "M9.695 4.024A2 2 0 0 1 10.004 4h3.993a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v7.344"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/candy-cane.js
var CandyCane = [
  [
    "path",
    { d: "M5.7 21a2 2 0 0 1-3.5-2l8.6-14a6 6 0 0 1 10.4 6 2 2 0 1 1-3.464-2 2 2 0 1 0-3.464-2Z" }
  ],
  ["path", { d: "M17.75 7 15 2.1" }],
  ["path", { d: "M10.9 4.8 13 9" }],
  ["path", { d: "m7.9 9.7 2 4.4" }],
  ["path", { d: "M4.9 14.7 7 18.9" }]
];

// node_modules/lucide/dist/esm/icons/candy-off.js
var CandyOff = [
  ["path", { d: "M10 10v7.9" }],
  ["path", { d: "M11.802 6.145a5 5 0 0 1 6.053 6.053" }],
  ["path", { d: "M14 6.1v2.243" }],
  ["path", { d: "m15.5 15.571-.964.964a5 5 0 0 1-7.071 0 5 5 0 0 1 0-7.07l.964-.965" }],
  [
    "path",
    {
      d: "M16 7V3a1 1 0 0 1 1.707-.707 2.5 2.5 0 0 0 2.152.717 1 1 0 0 1 1.131 1.131 2.5 2.5 0 0 0 .717 2.152A1 1 0 0 1 21 8h-4"
    }
  ],
  ["path", { d: "m2 2 20 20" }],
  [
    "path",
    {
      d: "M8 17v4a1 1 0 0 1-1.707.707 2.5 2.5 0 0 0-2.152-.717 1 1 0 0 1-1.131-1.131 2.5 2.5 0 0 0-.717-2.152A1 1 0 0 1 3 16h4"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/candy.js
var Candy = [
  ["path", { d: "M10 7v10.9" }],
  ["path", { d: "M14 6.1V17" }],
  [
    "path",
    {
      d: "M16 7V3a1 1 0 0 1 1.707-.707 2.5 2.5 0 0 0 2.152.717 1 1 0 0 1 1.131 1.131 2.5 2.5 0 0 0 .717 2.152A1 1 0 0 1 21 8h-4"
    }
  ],
  [
    "path",
    {
      d: "M16.536 7.465a5 5 0 0 0-7.072 0l-2 2a5 5 0 0 0 0 7.07 5 5 0 0 0 7.072 0l2-2a5 5 0 0 0 0-7.07"
    }
  ],
  [
    "path",
    {
      d: "M8 17v4a1 1 0 0 1-1.707.707 2.5 2.5 0 0 0-2.152-.717 1 1 0 0 1-1.131-1.131 2.5 2.5 0 0 0-.717-2.152A1 1 0 0 1 3 16h4"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/cannabis.js
var Cannabis = [
  ["path", { d: "M12 22v-4" }],
  [
    "path",
    {
      d: "M7 12c-1.5 0-4.5 1.5-5 3 3.5 1.5 6 1 6 1-1.5 1.5-2 3.5-2 5 2.5 0 4.5-1.5 6-3 1.5 1.5 3.5 3 6 3 0-1.5-.5-3.5-2-5 0 0 2.5.5 6-1-.5-1.5-3.5-3-5-3 1.5-1 4-4 4-6-2.5 0-5.5 1.5-7 3 0-2.5-.5-5-2-7-1.5 2-2 4.5-2 7-1.5-1.5-4.5-3-7-3 0 2 2.5 5 4 6"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/captions-off.js
var CaptionsOff = [
  ["path", { d: "M10.5 5H19a2 2 0 0 1 2 2v8.5" }],
  ["path", { d: "M17 11h-.5" }],
  ["path", { d: "M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M7 11h4" }],
  ["path", { d: "M7 15h2.5" }]
];

// node_modules/lucide/dist/esm/icons/captions.js
var Captions = [
  ["rect", { width: "18", height: "14", x: "3", y: "5", rx: "2", ry: "2" }],
  ["path", { d: "M7 15h4M15 15h2M7 11h2M13 11h4" }]
];

// node_modules/lucide/dist/esm/icons/car-front.js
var CarFront = [
  ["path", { d: "m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" }],
  ["path", { d: "M7 14h.01" }],
  ["path", { d: "M17 14h.01" }],
  ["rect", { width: "18", height: "8", x: "3", y: "10", rx: "2" }],
  ["path", { d: "M5 18v2" }],
  ["path", { d: "M19 18v2" }]
];

// node_modules/lucide/dist/esm/icons/car-taxi-front.js
var CarTaxiFront = [
  ["path", { d: "M10 2h4" }],
  ["path", { d: "m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" }],
  ["path", { d: "M7 14h.01" }],
  ["path", { d: "M17 14h.01" }],
  ["rect", { width: "18", height: "8", x: "3", y: "10", rx: "2" }],
  ["path", { d: "M5 18v2" }],
  ["path", { d: "M19 18v2" }]
];

// node_modules/lucide/dist/esm/icons/car.js
var Car = [
  [
    "path",
    {
      d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"
    }
  ],
  ["circle", { cx: "7", cy: "17", r: "2" }],
  ["path", { d: "M9 17h6" }],
  ["circle", { cx: "17", cy: "17", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/caravan.js
var Caravan = [
  ["path", { d: "M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2" }],
  ["path", { d: "M2 9h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2" }],
  ["path", { d: "M22 17v1a1 1 0 0 1-1 1H10v-9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9" }],
  ["circle", { cx: "8", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/carrot.js
var Carrot = [
  [
    "path",
    {
      d: "M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"
    }
  ],
  ["path", { d: "M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z" }],
  ["path", { d: "M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z" }]
];

// node_modules/lucide/dist/esm/icons/card-sim.js
var CardSim = [
  ["path", { d: "M12 14v4" }],
  [
    "path",
    {
      d: "M14.172 2a2 2 0 0 1 1.414.586l3.828 3.828A2 2 0 0 1 20 7.828V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
    }
  ],
  ["path", { d: "M8 14h8" }],
  ["rect", { x: "8", y: "10", width: "8", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/case-lower.js
var CaseLower = [
  ["path", { d: "M10 9v7" }],
  ["path", { d: "M14 6v10" }],
  ["circle", { cx: "17.5", cy: "12.5", r: "3.5" }],
  ["circle", { cx: "6.5", cy: "12.5", r: "3.5" }]
];

// node_modules/lucide/dist/esm/icons/case-sensitive.js
var CaseSensitive = [
  ["path", { d: "m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" }],
  ["path", { d: "M22 9v7" }],
  ["path", { d: "M3.304 13h6.392" }],
  ["circle", { cx: "18.5", cy: "12.5", r: "3.5" }]
];

// node_modules/lucide/dist/esm/icons/case-upper.js
var CaseUpper = [
  [
    "path",
    { d: "M15 11h4.5a1 1 0 0 1 0 5h-4a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h3a1 1 0 0 1 0 5" }
  ],
  ["path", { d: "m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16" }],
  ["path", { d: "M3.304 13h6.392" }]
];

// node_modules/lucide/dist/esm/icons/cast.js
var Cast = [
  ["path", { d: "M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" }],
  ["path", { d: "M2 12a9 9 0 0 1 8 8" }],
  ["path", { d: "M2 16a5 5 0 0 1 4 4" }],
  ["line", { x1: "2", x2: "2.01", y1: "20", y2: "20" }]
];

// node_modules/lucide/dist/esm/icons/cassette-tape.js
var CassetteTape = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["circle", { cx: "8", cy: "10", r: "2" }],
  ["path", { d: "M8 12h8" }],
  ["circle", { cx: "16", cy: "10", r: "2" }],
  ["path", { d: "m6 20 .7-2.9A1.4 1.4 0 0 1 8.1 16h7.8a1.4 1.4 0 0 1 1.4 1l.7 3" }]
];

// node_modules/lucide/dist/esm/icons/castle.js
var Castle = [
  ["path", { d: "M10 5V3" }],
  ["path", { d: "M14 5V3" }],
  ["path", { d: "M15 21v-3a3 3 0 0 0-6 0v3" }],
  ["path", { d: "M18 3v8" }],
  ["path", { d: "M18 5H6" }],
  ["path", { d: "M22 11H2" }],
  ["path", { d: "M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9" }],
  ["path", { d: "M6 3v8" }]
];

// node_modules/lucide/dist/esm/icons/cat.js
var Cat = [
  [
    "path",
    {
      d: "M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"
    }
  ],
  ["path", { d: "M8 14v.5" }],
  ["path", { d: "M16 14v.5" }],
  ["path", { d: "M11.25 16.25h1.5L12 17l-.75-.75Z" }]
];

// node_modules/lucide/dist/esm/icons/cctv.js
var Cctv = [
  [
    "path",
    { d: "M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97" }
  ],
  [
    "path",
    {
      d: "M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"
    }
  ],
  ["path", { d: "M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15" }],
  ["path", { d: "M2 21v-4" }],
  ["path", { d: "M7 9h.01" }]
];

// node_modules/lucide/dist/esm/icons/chart-area.js
var ChartArea = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  [
    "path",
    {
      d: "M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/chart-bar-big.js
var ChartBarBig = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["rect", { x: "7", y: "13", width: "9", height: "4", rx: "1" }],
  ["rect", { x: "7", y: "5", width: "12", height: "4", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/chart-bar-decreasing.js
var ChartBarDecreasing = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M7 11h8" }],
  ["path", { d: "M7 16h3" }],
  ["path", { d: "M7 6h12" }]
];

// node_modules/lucide/dist/esm/icons/chart-bar-increasing.js
var ChartBarIncreasing = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M7 11h8" }],
  ["path", { d: "M7 16h12" }],
  ["path", { d: "M7 6h3" }]
];

// node_modules/lucide/dist/esm/icons/chart-bar-stacked.js
var ChartBarStacked = [
  ["path", { d: "M11 13v4" }],
  ["path", { d: "M15 5v4" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["rect", { x: "7", y: "13", width: "9", height: "4", rx: "1" }],
  ["rect", { x: "7", y: "5", width: "12", height: "4", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/chart-bar.js
var ChartBar = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M7 16h8" }],
  ["path", { d: "M7 11h12" }],
  ["path", { d: "M7 6h3" }]
];

// node_modules/lucide/dist/esm/icons/chart-candlestick.js
var ChartCandlestick = [
  ["path", { d: "M9 5v4" }],
  ["rect", { width: "4", height: "6", x: "7", y: "9", rx: "1" }],
  ["path", { d: "M9 15v2" }],
  ["path", { d: "M17 3v2" }],
  ["rect", { width: "4", height: "8", x: "15", y: "5", rx: "1" }],
  ["path", { d: "M17 13v3" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }]
];

// node_modules/lucide/dist/esm/icons/chart-column-big.js
var ChartColumnBig = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["rect", { x: "15", y: "5", width: "4", height: "12", rx: "1" }],
  ["rect", { x: "7", y: "8", width: "4", height: "9", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/chart-column-decreasing.js
var ChartColumnDecreasing = [
  ["path", { d: "M13 17V9" }],
  ["path", { d: "M18 17v-3" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M8 17V5" }]
];

// node_modules/lucide/dist/esm/icons/chart-column-increasing.js
var ChartColumnIncreasing = [
  ["path", { d: "M13 17V9" }],
  ["path", { d: "M18 17V5" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M8 17v-3" }]
];

// node_modules/lucide/dist/esm/icons/chart-column-stacked.js
var ChartColumnStacked = [
  ["path", { d: "M11 13H7" }],
  ["path", { d: "M19 9h-4" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["rect", { x: "15", y: "5", width: "4", height: "12", rx: "1" }],
  ["rect", { x: "7", y: "8", width: "4", height: "9", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/chart-column.js
var ChartColumn = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M18 17V9" }],
  ["path", { d: "M13 17V5" }],
  ["path", { d: "M8 17v-3" }]
];

// node_modules/lucide/dist/esm/icons/chart-gantt.js
var ChartGantt = [
  ["path", { d: "M10 6h8" }],
  ["path", { d: "M12 16h6" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M8 11h7" }]
];

// node_modules/lucide/dist/esm/icons/chart-line.js
var ChartLine = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "m19 9-5 5-4-4-3 3" }]
];

// node_modules/lucide/dist/esm/icons/chart-network.js
var ChartNetwork = [
  ["path", { d: "m13.11 7.664 1.78 2.672" }],
  ["path", { d: "m14.162 12.788-3.324 1.424" }],
  ["path", { d: "m20 4-6.06 1.515" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["circle", { cx: "12", cy: "6", r: "2" }],
  ["circle", { cx: "16", cy: "12", r: "2" }],
  ["circle", { cx: "9", cy: "15", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/chart-no-axes-column-decreasing.js
var ChartNoAxesColumnDecreasing = [
  ["path", { d: "M5 21V3" }],
  ["path", { d: "M12 21V9" }],
  ["path", { d: "M19 21v-6" }]
];

// node_modules/lucide/dist/esm/icons/chart-no-axes-column-increasing.js
var ChartNoAxesColumnIncreasing = [
  ["path", { d: "M5 21v-6" }],
  ["path", { d: "M12 21V9" }],
  ["path", { d: "M19 21V3" }]
];

// node_modules/lucide/dist/esm/icons/chart-no-axes-column.js
var ChartNoAxesColumn = [
  ["path", { d: "M5 21v-6" }],
  ["path", { d: "M12 21V3" }],
  ["path", { d: "M19 21V9" }]
];

// node_modules/lucide/dist/esm/icons/chart-no-axes-gantt.js
var ChartNoAxesGantt = [
  ["path", { d: "M6 5h12" }],
  ["path", { d: "M4 12h10" }],
  ["path", { d: "M12 19h8" }]
];

// node_modules/lucide/dist/esm/icons/chart-no-axes-combined.js
var ChartNoAxesCombined = [
  ["path", { d: "M12 16v5" }],
  ["path", { d: "M16 14v7" }],
  ["path", { d: "M20 10v11" }],
  ["path", { d: "m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" }],
  ["path", { d: "M4 18v3" }],
  ["path", { d: "M8 14v7" }]
];

// node_modules/lucide/dist/esm/icons/chart-pie.js
var ChartPie = [
  [
    "path",
    {
      d: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"
    }
  ],
  ["path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }]
];

// node_modules/lucide/dist/esm/icons/chart-scatter.js
var ChartScatter = [
  ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "18.5", cy: "5.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "11.5", cy: "11.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "7.5", cy: "16.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "17.5", cy: "14.5", r: ".5", fill: "currentColor" }],
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }]
];

// node_modules/lucide/dist/esm/icons/chart-spline.js
var ChartSpline = [
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" }]
];

// node_modules/lucide/dist/esm/icons/check-check.js
var CheckCheck = [
  ["path", { d: "M18 6 7 17l-5-5" }],
  ["path", { d: "m22 10-7.5 7.5L13 16" }]
];

// node_modules/lucide/dist/esm/icons/check.js
var Check = [["path", { d: "M20 6 9 17l-5-5" }]];

// node_modules/lucide/dist/esm/icons/check-line.js
var CheckLine = [
  ["path", { d: "M20 4L9 15" }],
  ["path", { d: "M21 19L3 19" }],
  ["path", { d: "M9 15L4 10" }]
];

// node_modules/lucide/dist/esm/icons/chef-hat.js
var ChefHat = [
  [
    "path",
    {
      d: "M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"
    }
  ],
  ["path", { d: "M6 17h12" }]
];

// node_modules/lucide/dist/esm/icons/cherry.js
var Cherry = [
  ["path", { d: "M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z" }],
  ["path", { d: "M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z" }],
  ["path", { d: "M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12" }],
  ["path", { d: "M22 9c-4.29 0-7.14-2.33-10-7 5.71 0 10 4.67 10 7Z" }]
];

// node_modules/lucide/dist/esm/icons/chevron-down.js
var ChevronDown = [["path", { d: "m6 9 6 6 6-6" }]];

// node_modules/lucide/dist/esm/icons/chevron-first.js
var ChevronFirst = [
  ["path", { d: "m17 18-6-6 6-6" }],
  ["path", { d: "M7 6v12" }]
];

// node_modules/lucide/dist/esm/icons/chevron-last.js
var ChevronLast = [
  ["path", { d: "m7 18 6-6-6-6" }],
  ["path", { d: "M17 6v12" }]
];

// node_modules/lucide/dist/esm/icons/chevron-right.js
var ChevronRight = [["path", { d: "m9 18 6-6-6-6" }]];

// node_modules/lucide/dist/esm/icons/chevron-up.js
var ChevronUp = [["path", { d: "m18 15-6-6-6 6" }]];

// node_modules/lucide/dist/esm/icons/chevron-left.js
var ChevronLeft = [["path", { d: "m15 18-6-6 6-6" }]];

// node_modules/lucide/dist/esm/icons/chevrons-down-up.js
var ChevronsDownUp = [
  ["path", { d: "m7 20 5-5 5 5" }],
  ["path", { d: "m7 4 5 5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-down.js
var ChevronsDown = [
  ["path", { d: "m7 6 5 5 5-5" }],
  ["path", { d: "m7 13 5 5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-left-right-ellipsis.js
var ChevronsLeftRightEllipsis = [
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M16 12h.01" }],
  ["path", { d: "m17 7 5 5-5 5" }],
  ["path", { d: "m7 7-5 5 5 5" }],
  ["path", { d: "M8 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-left-right.js
var ChevronsLeftRight = [
  ["path", { d: "m9 7-5 5 5 5" }],
  ["path", { d: "m15 7 5 5-5 5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-left.js
var ChevronsLeft = [
  ["path", { d: "m11 17-5-5 5-5" }],
  ["path", { d: "m18 17-5-5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-right-left.js
var ChevronsRightLeft = [
  ["path", { d: "m20 17-5-5 5-5" }],
  ["path", { d: "m4 17 5-5-5-5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-right.js
var ChevronsRight = [
  ["path", { d: "m6 17 5-5-5-5" }],
  ["path", { d: "m13 17 5-5-5-5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-up.js
var ChevronsUp = [
  ["path", { d: "m17 11-5-5-5 5" }],
  ["path", { d: "m17 18-5-5-5 5" }]
];

// node_modules/lucide/dist/esm/icons/chevrons-up-down.js
var ChevronsUpDown = [
  ["path", { d: "m7 15 5 5 5-5" }],
  ["path", { d: "m7 9 5-5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/church.js
var Church = [
  ["path", { d: "M10 9h4" }],
  ["path", { d: "M12 7v5" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
  [
    "path",
    {
      d: "m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9"
    }
  ],
  ["path", { d: "M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14" }]
];

// node_modules/lucide/dist/esm/icons/chromium.js
var Chromium = [
  ["path", { d: "M10.88 21.94 15.46 14" }],
  ["path", { d: "M21.17 8H12" }],
  ["path", { d: "M3.95 6.06 8.54 14" }],
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "12", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/cigarette-off.js
var CigaretteOff = [
  ["path", { d: "M12 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h13" }],
  ["path", { d: "M18 8c0-2.5-2-2.5-2-5" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M21 12a1 1 0 0 1 1 1v2a1 1 0 0 1-.5.866" }],
  ["path", { d: "M22 8c0-2.5-2-2.5-2-5" }],
  ["path", { d: "M7 12v4" }]
];

// node_modules/lucide/dist/esm/icons/cigarette.js
var Cigarette = [
  ["path", { d: "M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14" }],
  ["path", { d: "M18 8c0-2.5-2-2.5-2-5" }],
  ["path", { d: "M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }],
  ["path", { d: "M22 8c0-2.5-2-2.5-2-5" }],
  ["path", { d: "M7 12v4" }]
];

// node_modules/lucide/dist/esm/icons/circle-alert.js
var CircleAlert = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-down.js
var CircleArrowDown = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 8v8" }],
  ["path", { d: "m8 12 4 4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-left.js
var CircleArrowLeft = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m12 8-4 4 4 4" }],
  ["path", { d: "M16 12H8" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-out-down-left.js
var CircleArrowOutDownLeft = [
  ["path", { d: "M2 12a10 10 0 1 1 10 10" }],
  ["path", { d: "m2 22 10-10" }],
  ["path", { d: "M8 22H2v-6" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-out-down-right.js
var CircleArrowOutDownRight = [
  ["path", { d: "M12 22a10 10 0 1 1 10-10" }],
  ["path", { d: "M22 22 12 12" }],
  ["path", { d: "M22 16v6h-6" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-out-up-left.js
var CircleArrowOutUpLeft = [
  ["path", { d: "M2 8V2h6" }],
  ["path", { d: "m2 2 10 10" }],
  ["path", { d: "M12 2A10 10 0 1 1 2 12" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-out-up-right.js
var CircleArrowOutUpRight = [
  ["path", { d: "M22 12A10 10 0 1 1 12 2" }],
  ["path", { d: "M22 2 12 12" }],
  ["path", { d: "M16 2h6v6" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-right.js
var CircleArrowRight = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m12 16 4-4-4-4" }],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/circle-arrow-up.js
var CircleArrowUp = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m16 12-4-4-4 4" }],
  ["path", { d: "M12 16V8" }]
];

// node_modules/lucide/dist/esm/icons/circle-check-big.js
var CircleCheckBig = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335" }],
  ["path", { d: "m9 11 3 3L22 4" }]
];

// node_modules/lucide/dist/esm/icons/circle-chevron-down.js
var CircleChevronDown = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m16 10-4 4-4-4" }]
];

// node_modules/lucide/dist/esm/icons/circle-check.js
var CircleCheck = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m9 12 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/circle-chevron-left.js
var CircleChevronLeft = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m14 16-4-4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/circle-chevron-right.js
var CircleChevronRight = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m10 8 4 4-4 4" }]
];

// node_modules/lucide/dist/esm/icons/circle-chevron-up.js
var CircleChevronUp = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m8 14 4-4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/circle-dashed.js
var CircleDashed = [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7" }]
];

// node_modules/lucide/dist/esm/icons/circle-divide.js
var CircleDivide = [
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "16", y2: "16" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "8" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-dollar-sign.js
var CircleDollarSign = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }],
  ["path", { d: "M12 18V6" }]
];

// node_modules/lucide/dist/esm/icons/circle-dot-dashed.js
var CircleDotDashed = [
  ["path", { d: "M10.1 2.18a9.93 9.93 0 0 1 3.8 0" }],
  ["path", { d: "M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7" }],
  ["path", { d: "M21.82 10.1a9.93 9.93 0 0 1 0 3.8" }],
  ["path", { d: "M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69" }],
  ["path", { d: "M13.9 21.82a9.94 9.94 0 0 1-3.8 0" }],
  ["path", { d: "M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7" }],
  ["path", { d: "M2.18 13.9a9.93 9.93 0 0 1 0-3.8" }],
  ["path", { d: "M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69" }],
  ["circle", { cx: "12", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/circle-dot.js
var CircleDot = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/circle-ellipsis.js
var CircleEllipsis = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M17 12h.01" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M7 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/circle-equal.js
var CircleEqual = [
  ["path", { d: "M7 10h10" }],
  ["path", { d: "M7 14h10" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-fading-arrow-up.js
var CircleFadingArrowUp = [
  ["path", { d: "M12 2a10 10 0 0 1 7.38 16.75" }],
  ["path", { d: "m16 12-4-4-4 4" }],
  ["path", { d: "M12 16V8" }],
  ["path", { d: "M2.5 8.875a10 10 0 0 0-.5 3" }],
  ["path", { d: "M2.83 16a10 10 0 0 0 2.43 3.4" }],
  ["path", { d: "M4.636 5.235a10 10 0 0 1 .891-.857" }],
  ["path", { d: "M8.644 21.42a10 10 0 0 0 7.631-.38" }]
];

// node_modules/lucide/dist/esm/icons/circle-fading-plus.js
var CircleFadingPlus = [
  ["path", { d: "M12 2a10 10 0 0 1 7.38 16.75" }],
  ["path", { d: "M12 8v8" }],
  ["path", { d: "M16 12H8" }],
  ["path", { d: "M2.5 8.875a10 10 0 0 0-.5 3" }],
  ["path", { d: "M2.83 16a10 10 0 0 0 2.43 3.4" }],
  ["path", { d: "M4.636 5.235a10 10 0 0 1 .891-.857" }],
  ["path", { d: "M8.644 21.42a10 10 0 0 0 7.631-.38" }]
];

// node_modules/lucide/dist/esm/icons/circle-gauge.js
var CircleGauge = [
  ["path", { d: "M15.6 2.7a10 10 0 1 0 5.7 5.7" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "M13.4 10.6 19 5" }]
];

// node_modules/lucide/dist/esm/icons/circle-minus.js
var CircleMinus = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/circle-off.js
var CircleOff = [
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.35 2.69A10 10 0 0 1 21.3 15.65" }],
  ["path", { d: "M19.08 19.08A10 10 0 1 1 4.92 4.92" }]
];

// node_modules/lucide/dist/esm/icons/circle-parking-off.js
var CircleParkingOff = [
  ["path", { d: "M12.656 7H13a3 3 0 0 1 2.984 3.307" }],
  ["path", { d: "M13 13H9" }],
  ["path", { d: "M19.071 19.071A1 1 0 0 1 4.93 4.93" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.357 2.687a10 10 0 0 1 12.956 12.956" }],
  ["path", { d: "M9 17V9" }]
];

// node_modules/lucide/dist/esm/icons/circle-parking.js
var CircleParking = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M9 17V7h4a3 3 0 0 1 0 6H9" }]
];

// node_modules/lucide/dist/esm/icons/circle-pause.js
var CirclePause = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "10", x2: "10", y1: "15", y2: "9" }],
  ["line", { x1: "14", x2: "14", y1: "15", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/circle-percent.js
var CirclePercent = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "M9 9h.01" }],
  ["path", { d: "M15 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/circle-play.js
var CirclePlay = [
  [
    "path",
    {
      d: "M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-plus.js
var CirclePlus = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "M12 8v8" }]
];

// node_modules/lucide/dist/esm/icons/circle-pound-sterling.js
var CirclePoundSterling = [
  ["path", { d: "M10 16V9.5a1 1 0 0 1 5 0" }],
  ["path", { d: "M8 12h4" }],
  ["path", { d: "M8 16h7" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-power.js
var CirclePower = [
  ["path", { d: "M12 7v4" }],
  ["path", { d: "M7.998 9.003a5 5 0 1 0 8-.005" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-question-mark.js
var CircleQuestionMark = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }],
  ["path", { d: "M12 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/circle-slash-2.js
var CircleSlash2 = [
  ["path", { d: "M22 2 2 22" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-slash.js
var CircleSlash = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "9", x2: "15", y1: "15", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/circle-small.js
var CircleSmall = [["circle", { cx: "12", cy: "12", r: "6" }]];

// node_modules/lucide/dist/esm/icons/circle-star.js
var CircleStar = [
  [
    "path",
    {
      d: "M11.051 7.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.867l-1.156-1.152a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-stop.js
var CircleStop = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/circle-user-round.js
var CircleUserRound = [
  ["path", { d: "M18 20a6 6 0 0 0-12 0" }],
  ["circle", { cx: "12", cy: "10", r: "4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/circle-user.js
var CircleUser = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" }]
];

// node_modules/lucide/dist/esm/icons/circle-x.js
var CircleX = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "m9 9 6 6" }]
];

// node_modules/lucide/dist/esm/icons/circle.js
var Circle = [["circle", { cx: "12", cy: "12", r: "10" }]];

// node_modules/lucide/dist/esm/icons/circuit-board.js
var CircuitBoard = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M11 9h4a2 2 0 0 0 2-2V3" }],
  ["circle", { cx: "9", cy: "9", r: "2" }],
  ["path", { d: "M7 21v-4a2 2 0 0 1 2-2h4" }],
  ["circle", { cx: "15", cy: "15", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/citrus.js
var Citrus = [
  [
    "path",
    { d: "M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z" }
  ],
  ["path", { d: "M19.65 15.66A8 8 0 0 1 8.35 4.34" }],
  ["path", { d: "m14 10-5.5 5.5" }],
  ["path", { d: "M14 17.85V10H6.15" }]
];

// node_modules/lucide/dist/esm/icons/clapperboard.js
var Clapperboard = [
  ["path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }],
  ["path", { d: "m6.2 5.3 3.1 3.9" }],
  ["path", { d: "m12.4 3.4 3.1 4" }],
  ["path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-check.js
var ClipboardCheck = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "m9 14 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-clock.js
var ClipboardClock = [
  ["path", { d: "M16 14v2.2l1.6 1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v.832" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2" }],
  ["circle", { cx: "16", cy: "16", r: "6" }],
  ["rect", { x: "8", y: "2", width: "8", height: "4", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-copy.js
var ClipboardCopy = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v4" }],
  ["path", { d: "M21 14H11" }],
  ["path", { d: "m15 10-4 4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-list.js
var ClipboardList = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M12 11h4" }],
  ["path", { d: "M12 16h4" }],
  ["path", { d: "M8 11h.01" }],
  ["path", { d: "M8 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-minus.js
var ClipboardMinus = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M9 14h6" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-paste.js
var ClipboardPaste = [
  ["path", { d: "M11 14h10" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v1.344" }],
  ["path", { d: "m17 18 4-4-4-4" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113" }],
  ["rect", { x: "8", y: "2", width: "8", height: "4", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-pen-line.js
var ClipboardPenLine = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1" }],
  ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 1.73 1" }],
  ["path", { d: "M8 18h1" }],
  [
    "path",
    {
      d: "M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/clipboard-pen.js
var ClipboardPen = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5" }],
  ["path", { d: "M4 13.5V6a2 2 0 0 1 2-2h2" }],
  [
    "path",
    {
      d: "M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/clipboard-type.js
var ClipboardType = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M9 12v-1h6v1" }],
  ["path", { d: "M11 17h2" }],
  ["path", { d: "M12 11v6" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-x.js
var ClipboardX = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "m15 11-6 6" }],
  ["path", { d: "m9 11 6 6" }]
];

// node_modules/lucide/dist/esm/icons/clipboard-plus.js
var ClipboardPlus = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M9 14h6" }],
  ["path", { d: "M12 17v-6" }]
];

// node_modules/lucide/dist/esm/icons/clipboard.js
var Clipboard2 = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }]
];

// node_modules/lucide/dist/esm/icons/clock-1.js
var Clock1 = [
  ["path", { d: "M12 6v6l2-4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-10.js
var Clock10 = [
  ["path", { d: "M12 6v6l-4-2" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-11.js
var Clock11 = [
  ["path", { d: "M12 6v6l-2-4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-12.js
var Clock12 = [
  ["path", { d: "M12 6v6" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-2.js
var Clock2 = [
  ["path", { d: "M12 6v6l4-2" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-3.js
var Clock3 = [
  ["path", { d: "M12 6v6h4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-4.js
var Clock4 = [
  ["path", { d: "M12 6v6l4 2" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-5.js
var Clock5 = [
  ["path", { d: "M12 6v6l2 4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-6.js
var Clock6 = [
  ["path", { d: "M12 6v10" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-7.js
var Clock7 = [
  ["path", { d: "M12 6v6l-2 4" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-8.js
var Clock8 = [
  ["path", { d: "M12 6v6l-4 2" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-9.js
var Clock9 = [
  ["path", { d: "M12 6v6H8" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/clock-alert.js
var ClockAlert = [
  ["path", { d: "M12 6v6l4 2" }],
  ["path", { d: "M20 12v5" }],
  ["path", { d: "M20 21h.01" }],
  ["path", { d: "M21.25 8.2A10 10 0 1 0 16 21.16" }]
];

// node_modules/lucide/dist/esm/icons/clock-arrow-down.js
var ClockArrowDown = [
  ["path", { d: "M12 6v6l2 1" }],
  ["path", { d: "M12.337 21.994a10 10 0 1 1 9.588-8.767" }],
  ["path", { d: "m14 18 4 4 4-4" }],
  ["path", { d: "M18 14v8" }]
];

// node_modules/lucide/dist/esm/icons/clock-arrow-up.js
var ClockArrowUp = [
  ["path", { d: "M12 6v6l1.56.78" }],
  ["path", { d: "M13.227 21.925a10 10 0 1 1 8.767-9.588" }],
  ["path", { d: "m14 18 4-4 4 4" }],
  ["path", { d: "M18 22v-8" }]
];

// node_modules/lucide/dist/esm/icons/clock-fading.js
var ClockFading = [
  ["path", { d: "M12 2a10 10 0 0 1 7.38 16.75" }],
  ["path", { d: "M12 6v6l4 2" }],
  ["path", { d: "M2.5 8.875a10 10 0 0 0-.5 3" }],
  ["path", { d: "M2.83 16a10 10 0 0 0 2.43 3.4" }],
  ["path", { d: "M4.636 5.235a10 10 0 0 1 .891-.857" }],
  ["path", { d: "M8.644 21.42a10 10 0 0 0 7.631-.38" }]
];

// node_modules/lucide/dist/esm/icons/clock-plus.js
var ClockPlus = [
  ["path", { d: "M12 6v6l3.644 1.822" }],
  ["path", { d: "M16 19h6" }],
  ["path", { d: "M19 16v6" }],
  ["path", { d: "M21.92 13.267a10 10 0 1 0-8.653 8.653" }]
];

// node_modules/lucide/dist/esm/icons/clock.js
var Clock = [
  ["path", { d: "M12 6v6l4 2" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/closed-caption.js
var ClosedCaption = [
  ["path", { d: "M10 9.17a3 3 0 1 0 0 5.66" }],
  ["path", { d: "M17 9.17a3 3 0 1 0 0 5.66" }],
  ["rect", { x: "2", y: "5", width: "20", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/cloud-alert.js
var CloudAlert = [
  ["path", { d: "M12 12v4" }],
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M17 18h.5a1 1 0 0 0 0-9h-1.79A7 7 0 1 0 7 17.708" }]
];

// node_modules/lucide/dist/esm/icons/cloud-check.js
var CloudCheck = [
  ["path", { d: "m17 15-5.5 5.5L9 18" }],
  ["path", { d: "M5 17.743A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.742" }]
];

// node_modules/lucide/dist/esm/icons/cloud-cog.js
var CloudCog = [
  ["path", { d: "m10.852 19.772-.383.924" }],
  ["path", { d: "m13.148 14.228.383-.923" }],
  ["path", { d: "M13.148 19.772a3 3 0 1 0-2.296-5.544l-.383-.923" }],
  ["path", { d: "m13.53 20.696-.382-.924a3 3 0 1 1-2.296-5.544" }],
  ["path", { d: "m14.772 15.852.923-.383" }],
  ["path", { d: "m14.772 18.148.923.383" }],
  ["path", { d: "M4.2 15.1a7 7 0 1 1 9.93-9.858A7 7 0 0 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2" }],
  ["path", { d: "m9.228 15.852-.923-.383" }],
  ["path", { d: "m9.228 18.148-.923.383" }]
];

// node_modules/lucide/dist/esm/icons/cloud-download.js
var CloudDownload = [
  ["path", { d: "M12 13v8l-4-4" }],
  ["path", { d: "m12 21 4-4" }],
  ["path", { d: "M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" }]
];

// node_modules/lucide/dist/esm/icons/cloud-drizzle.js
var CloudDrizzle = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "M8 19v1" }],
  ["path", { d: "M8 14v1" }],
  ["path", { d: "M16 19v1" }],
  ["path", { d: "M16 14v1" }],
  ["path", { d: "M12 21v1" }],
  ["path", { d: "M12 16v1" }]
];

// node_modules/lucide/dist/esm/icons/cloud-fog.js
var CloudFog = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "M16 17H7" }],
  ["path", { d: "M17 21H9" }]
];

// node_modules/lucide/dist/esm/icons/cloud-hail.js
var CloudHail = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "M16 14v2" }],
  ["path", { d: "M8 14v2" }],
  ["path", { d: "M16 20h.01" }],
  ["path", { d: "M8 20h.01" }],
  ["path", { d: "M12 16v2" }],
  ["path", { d: "M12 22h.01" }]
];

// node_modules/lucide/dist/esm/icons/cloud-lightning.js
var CloudLightning = [
  ["path", { d: "M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" }],
  ["path", { d: "m13 12-3 5h4l-3 5" }]
];

// node_modules/lucide/dist/esm/icons/cloud-moon-rain.js
var CloudMoonRain = [
  ["path", { d: "M11 20v2" }],
  [
    "path",
    {
      d: "M18.376 14.512a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36"
    }
  ],
  ["path", { d: "M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24" }],
  ["path", { d: "M7 19v2" }]
];

// node_modules/lucide/dist/esm/icons/cloud-off.js
var CloudOff = [
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" }],
  ["path", { d: "M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" }]
];

// node_modules/lucide/dist/esm/icons/cloud-moon.js
var CloudMoon = [
  ["path", { d: "M13 16a3 3 0 0 1 0 6H7a5 5 0 1 1 4.9-6z" }],
  [
    "path",
    {
      d: "M18.376 14.512a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/cloud-rain-wind.js
var CloudRainWind = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "m9.2 22 3-7" }],
  ["path", { d: "m9 13-3 7" }],
  ["path", { d: "m17 13-3 7" }]
];

// node_modules/lucide/dist/esm/icons/cloud-rain.js
var CloudRain = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "M16 14v6" }],
  ["path", { d: "M8 14v6" }],
  ["path", { d: "M12 16v6" }]
];

// node_modules/lucide/dist/esm/icons/cloud-snow.js
var CloudSnow = [
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "M8 15h.01" }],
  ["path", { d: "M8 19h.01" }],
  ["path", { d: "M12 17h.01" }],
  ["path", { d: "M12 21h.01" }],
  ["path", { d: "M16 15h.01" }],
  ["path", { d: "M16 19h.01" }]
];

// node_modules/lucide/dist/esm/icons/cloud-sun-rain.js
var CloudSunRain = [
  ["path", { d: "M12 2v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }],
  ["path", { d: "M15.947 12.65a4 4 0 0 0-5.925-4.128" }],
  ["path", { d: "M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24" }],
  ["path", { d: "M11 20v2" }],
  ["path", { d: "M7 19v2" }]
];

// node_modules/lucide/dist/esm/icons/cloud-sun.js
var CloudSun = [
  ["path", { d: "M12 2v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }],
  ["path", { d: "M15.947 12.65a4 4 0 0 0-5.925-4.128" }],
  ["path", { d: "M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" }]
];

// node_modules/lucide/dist/esm/icons/cloud-upload.js
var CloudUpload = [
  ["path", { d: "M12 13v8" }],
  ["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
  ["path", { d: "m8 17 4-4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/cloud.js
var Cloud = [["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }]];

// node_modules/lucide/dist/esm/icons/cloudy.js
var Cloudy = [
  ["path", { d: "M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }],
  ["path", { d: "M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5" }]
];

// node_modules/lucide/dist/esm/icons/clover.js
var Clover = [
  ["path", { d: "M16.17 7.83 2 22" }],
  [
    "path",
    {
      d: "M4.02 12a2.827 2.827 0 1 1 3.81-4.17A2.827 2.827 0 1 1 12 4.02a2.827 2.827 0 1 1 4.17 3.81A2.827 2.827 0 1 1 19.98 12a2.827 2.827 0 1 1-3.81 4.17A2.827 2.827 0 1 1 12 19.98a2.827 2.827 0 1 1-4.17-3.81A1 1 0 1 1 4 12"
    }
  ],
  ["path", { d: "m7.83 7.83 8.34 8.34" }]
];

// node_modules/lucide/dist/esm/icons/club.js
var Club = [
  [
    "path",
    { d: "M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z" }
  ],
  ["path", { d: "M12 17.66L12 22" }]
];

// node_modules/lucide/dist/esm/icons/code-xml.js
var CodeXml = [
  ["path", { d: "m18 16 4-4-4-4" }],
  ["path", { d: "m6 8-4 4 4 4" }],
  ["path", { d: "m14.5 4-5 16" }]
];

// node_modules/lucide/dist/esm/icons/code.js
var Code = [
  ["path", { d: "m16 18 6-6-6-6" }],
  ["path", { d: "m8 6-6 6 6 6" }]
];

// node_modules/lucide/dist/esm/icons/codepen.js
var Codepen = [
  ["polygon", { points: "12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "15.5" }],
  ["polyline", { points: "22 8.5 12 15.5 2 8.5" }],
  ["polyline", { points: "2 15.5 12 8.5 22 15.5" }],
  ["line", { x1: "12", x2: "12", y1: "2", y2: "8.5" }]
];

// node_modules/lucide/dist/esm/icons/codesandbox.js
var Codesandbox = [
  [
    "path",
    {
      d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
    }
  ],
  ["polyline", { points: "7.5 4.21 12 6.81 16.5 4.21" }],
  ["polyline", { points: "7.5 19.79 7.5 14.6 3 12" }],
  ["polyline", { points: "21 12 16.5 14.6 16.5 19.79" }],
  ["polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }],
  ["line", { x1: "12", x2: "12", y1: "22.08", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/coffee.js
var Coffee = [
  ["path", { d: "M10 2v2" }],
  ["path", { d: "M14 2v2" }],
  [
    "path",
    {
      d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
    }
  ],
  ["path", { d: "M6 2v2" }]
];

// node_modules/lucide/dist/esm/icons/cog.js
var Cog = [
  ["path", { d: "M11 10.27 7 3.34" }],
  ["path", { d: "m11 13.73-4 6.93" }],
  ["path", { d: "M12 22v-2" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M14 12h8" }],
  ["path", { d: "m17 20.66-1-1.73" }],
  ["path", { d: "m17 3.34-1 1.73" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "m20.66 17-1.73-1" }],
  ["path", { d: "m20.66 7-1.73 1" }],
  ["path", { d: "m3.34 17 1.73-1" }],
  ["path", { d: "m3.34 7 1.73 1" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["circle", { cx: "12", cy: "12", r: "8" }]
];

// node_modules/lucide/dist/esm/icons/coins.js
var Coins = [
  ["circle", { cx: "8", cy: "8", r: "6" }],
  ["path", { d: "M18.09 10.37A6 6 0 1 1 10.34 18" }],
  ["path", { d: "M7 6h1v4" }],
  ["path", { d: "m16.71 13.88.7.71-2.82 2.82" }]
];

// node_modules/lucide/dist/esm/icons/columns-2.js
var Columns2 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M12 3v18" }]
];

// node_modules/lucide/dist/esm/icons/columns-3-cog.js
var Columns3Cog = [
  ["path", { d: "M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5" }],
  ["path", { d: "m14.3 19.6 1-.4" }],
  ["path", { d: "M15 3v7.5" }],
  ["path", { d: "m15.2 16.9-.9-.3" }],
  ["path", { d: "m16.6 21.7.3-.9" }],
  ["path", { d: "m16.8 15.3-.4-1" }],
  ["path", { d: "m19.1 15.2.3-.9" }],
  ["path", { d: "m19.6 21.7-.4-1" }],
  ["path", { d: "m20.7 16.8 1-.4" }],
  ["path", { d: "m21.7 19.4-.9-.3" }],
  ["path", { d: "M9 3v18" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/columns-3.js
var Columns3 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 3v18" }],
  ["path", { d: "M15 3v18" }]
];

// node_modules/lucide/dist/esm/icons/columns-4.js
var Columns4 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7.5 3v18" }],
  ["path", { d: "M12 3v18" }],
  ["path", { d: "M16.5 3v18" }]
];

// node_modules/lucide/dist/esm/icons/combine.js
var Combine = [
  ["path", { d: "M14 3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1" }],
  ["path", { d: "M19 3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1" }],
  ["path", { d: "m7 15 3 3" }],
  ["path", { d: "m7 21 3-3H5a2 2 0 0 1-2-2v-2" }],
  ["rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" }],
  ["rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/compass.js
var Compass = [
  [
    "path",
    {
      d: "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/command.js
var Command = [
  ["path", { d: "M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" }]
];

// node_modules/lucide/dist/esm/icons/component.js
var Component2 = [
  [
    "path",
    {
      d: "M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"
    }
  ],
  [
    "path",
    {
      d: "M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"
    }
  ],
  [
    "path",
    {
      d: "M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"
    }
  ],
  [
    "path",
    {
      d: "M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/computer.js
var Computer = [
  ["rect", { width: "14", height: "8", x: "5", y: "2", rx: "2" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2" }],
  ["path", { d: "M6 18h2" }],
  ["path", { d: "M12 18h6" }]
];

// node_modules/lucide/dist/esm/icons/concierge-bell.js
var ConciergeBell = [
  ["path", { d: "M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z" }],
  ["path", { d: "M20 16a8 8 0 1 0-16 0" }],
  ["path", { d: "M12 4v4" }],
  ["path", { d: "M10 4h4" }]
];

// node_modules/lucide/dist/esm/icons/cone.js
var Cone = [
  ["path", { d: "m20.9 18.55-8-15.98a1 1 0 0 0-1.8 0l-8 15.98" }],
  ["ellipse", { cx: "12", cy: "19", rx: "9", ry: "3" }]
];

// node_modules/lucide/dist/esm/icons/construction.js
var Construction = [
  ["rect", { x: "2", y: "6", width: "20", height: "8", rx: "1" }],
  ["path", { d: "M17 14v7" }],
  ["path", { d: "M7 14v7" }],
  ["path", { d: "M17 3v3" }],
  ["path", { d: "M7 3v3" }],
  ["path", { d: "M10 14 2.3 6.3" }],
  ["path", { d: "m14 6 7.7 7.7" }],
  ["path", { d: "m8 6 8 8" }]
];

// node_modules/lucide/dist/esm/icons/contact-round.js
var ContactRound = [
  ["path", { d: "M16 2v2" }],
  ["path", { d: "M17.915 22a6 6 0 0 0-12 0" }],
  ["path", { d: "M8 2v2" }],
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/container.js
var Container = [
  [
    "path",
    {
      d: "M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"
    }
  ],
  ["path", { d: "M10 21.9V14L2.1 9.1" }],
  ["path", { d: "m10 14 11.9-6.9" }],
  ["path", { d: "M14 19.8v-8.1" }],
  ["path", { d: "M18 17.5V9.4" }]
];

// node_modules/lucide/dist/esm/icons/contact.js
var Contact = [
  ["path", { d: "M16 2v2" }],
  ["path", { d: "M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M8 2v2" }],
  ["circle", { cx: "12", cy: "11", r: "3" }],
  ["rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/contrast.js
var Contrast = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 18a6 6 0 0 0 0-12v12z" }]
];

// node_modules/lucide/dist/esm/icons/cookie.js
var Cookie = [
  ["path", { d: "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" }],
  ["path", { d: "M8.5 8.5v.01" }],
  ["path", { d: "M16 15.5v.01" }],
  ["path", { d: "M12 12v.01" }],
  ["path", { d: "M11 17v.01" }],
  ["path", { d: "M7 14v.01" }]
];

// node_modules/lucide/dist/esm/icons/cooking-pot.js
var CookingPot = [
  ["path", { d: "M2 12h20" }],
  ["path", { d: "M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" }],
  ["path", { d: "m4 8 16-4" }],
  ["path", { d: "m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" }]
];

// node_modules/lucide/dist/esm/icons/copy-check.js
var CopyCheck = [
  ["path", { d: "m12 15 2 2 4-4" }],
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copy-minus.js
var CopyMinus = [
  ["line", { x1: "12", x2: "18", y1: "15", y2: "15" }],
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copy-plus.js
var CopyPlus = [
  ["line", { x1: "15", x2: "15", y1: "12", y2: "18" }],
  ["line", { x1: "12", x2: "18", y1: "15", y2: "15" }],
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copy-slash.js
var CopySlash = [
  ["line", { x1: "12", x2: "18", y1: "18", y2: "12" }],
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copy-x.js
var CopyX = [
  ["line", { x1: "12", x2: "18", y1: "12", y2: "18" }],
  ["line", { x1: "12", x2: "18", y1: "18", y2: "12" }],
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copy.js
var Copy = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
];

// node_modules/lucide/dist/esm/icons/copyleft.js
var Copyleft = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M9.17 14.83a4 4 0 1 0 0-5.66" }]
];

// node_modules/lucide/dist/esm/icons/copyright.js
var Copyright = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M14.83 14.83a4 4 0 1 1 0-5.66" }]
];

// node_modules/lucide/dist/esm/icons/corner-down-right.js
var CornerDownRight = [
  ["path", { d: "m15 10 5 5-5 5" }],
  ["path", { d: "M4 4v7a4 4 0 0 0 4 4h12" }]
];

// node_modules/lucide/dist/esm/icons/corner-down-left.js
var CornerDownLeft = [
  ["path", { d: "M20 4v7a4 4 0 0 1-4 4H4" }],
  ["path", { d: "m9 10-5 5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/corner-left-down.js
var CornerLeftDown = [
  ["path", { d: "m14 15-5 5-5-5" }],
  ["path", { d: "M20 4h-7a4 4 0 0 0-4 4v12" }]
];

// node_modules/lucide/dist/esm/icons/corner-left-up.js
var CornerLeftUp = [
  ["path", { d: "M14 9 9 4 4 9" }],
  ["path", { d: "M20 20h-7a4 4 0 0 1-4-4V4" }]
];

// node_modules/lucide/dist/esm/icons/corner-right-down.js
var CornerRightDown = [
  ["path", { d: "m10 15 5 5 5-5" }],
  ["path", { d: "M4 4h7a4 4 0 0 1 4 4v12" }]
];

// node_modules/lucide/dist/esm/icons/corner-right-up.js
var CornerRightUp = [
  ["path", { d: "m10 9 5-5 5 5" }],
  ["path", { d: "M4 20h7a4 4 0 0 0 4-4V4" }]
];

// node_modules/lucide/dist/esm/icons/corner-up-left.js
var CornerUpLeft = [
  ["path", { d: "M20 20v-7a4 4 0 0 0-4-4H4" }],
  ["path", { d: "M9 14 4 9l5-5" }]
];

// node_modules/lucide/dist/esm/icons/corner-up-right.js
var CornerUpRight = [
  ["path", { d: "m15 14 5-5-5-5" }],
  ["path", { d: "M4 20v-7a4 4 0 0 1 4-4h12" }]
];

// node_modules/lucide/dist/esm/icons/cpu.js
var Cpu = [
  ["path", { d: "M12 20v2" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M17 20v2" }],
  ["path", { d: "M17 2v2" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M2 17h2" }],
  ["path", { d: "M2 7h2" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "M20 17h2" }],
  ["path", { d: "M20 7h2" }],
  ["path", { d: "M7 20v2" }],
  ["path", { d: "M7 2v2" }],
  ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
  ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/creative-commons.js
var CreativeCommons = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M10 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1" }],
  ["path", { d: "M17 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1" }]
];

// node_modules/lucide/dist/esm/icons/credit-card.js
var CreditCard = [
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }],
  ["line", { x1: "2", x2: "22", y1: "10", y2: "10" }]
];

// node_modules/lucide/dist/esm/icons/croissant.js
var Croissant = [
  ["path", { d: "M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" }],
  ["path", { d: "M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132" }],
  ["path", { d: "M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42" }],
  ["path", { d: "M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" }],
  [
    "path",
    {
      d: "M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/crop.js
var Crop = [
  ["path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }],
  ["path", { d: "M18 22V8a2 2 0 0 0-2-2H2" }]
];

// node_modules/lucide/dist/esm/icons/cross.js
var Cross = [
  [
    "path",
    {
      d: "M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/crosshair.js
var Crosshair = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "22", x2: "18", y1: "12", y2: "12" }],
  ["line", { x1: "6", x2: "2", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "6", y2: "2" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "18" }]
];

// node_modules/lucide/dist/esm/icons/crown.js
var Crown = [
  [
    "path",
    {
      d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
    }
  ],
  ["path", { d: "M5 21h14" }]
];

// node_modules/lucide/dist/esm/icons/cuboid.js
var Cuboid = [
  [
    "path",
    {
      d: "m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.95 8.41a2 2 0 0 0-.95 1.7v5.82a2 2 0 0 0 .88 1.66l6.05 4.07a2 2 0 0 0 2.17.05l9.95-6.12a2 2 0 0 0 .95-1.7V8.06a2 2 0 0 0-.88-1.66Z"
    }
  ],
  ["path", { d: "M10 22v-8L2.25 9.15" }],
  ["path", { d: "m10 14 11.77-6.87" }]
];

// node_modules/lucide/dist/esm/icons/cup-soda.js
var CupSoda = [
  ["path", { d: "m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" }],
  ["path", { d: "M5 8h14" }],
  ["path", { d: "M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0" }],
  ["path", { d: "m12 8 1-6h2" }]
];

// node_modules/lucide/dist/esm/icons/currency.js
var Currency = [
  ["circle", { cx: "12", cy: "12", r: "8" }],
  ["line", { x1: "3", x2: "6", y1: "3", y2: "6" }],
  ["line", { x1: "21", x2: "18", y1: "3", y2: "6" }],
  ["line", { x1: "3", x2: "6", y1: "21", y2: "18" }],
  ["line", { x1: "21", x2: "18", y1: "21", y2: "18" }]
];

// node_modules/lucide/dist/esm/icons/cylinder.js
var Cylinder = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
  ["path", { d: "M3 5v14a9 3 0 0 0 18 0V5" }]
];

// node_modules/lucide/dist/esm/icons/dam.js
var Dam = [
  ["path", { d: "M11 11.31c1.17.56 1.54 1.69 3.5 1.69 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" }],
  ["path", { d: "M11.75 18c.35.5 1.45 1 2.75 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" }],
  ["path", { d: "M2 10h4" }],
  ["path", { d: "M2 14h4" }],
  ["path", { d: "M2 18h4" }],
  ["path", { d: "M2 6h4" }],
  ["path", { d: "M7 3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1L10 4a1 1 0 0 0-1-1z" }]
];

// node_modules/lucide/dist/esm/icons/database-zap.js
var DatabaseZap = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 15 21.84" }],
  ["path", { d: "M21 5V8" }],
  ["path", { d: "M21 12L18 17H22L19 22" }],
  ["path", { d: "M3 12A9 3 0 0 0 14.59 14.87" }]
];

// node_modules/lucide/dist/esm/icons/database-backup.js
var DatabaseBackup = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
  ["path", { d: "M3 12a9 3 0 0 0 5 2.69" }],
  ["path", { d: "M21 9.3V5" }],
  ["path", { d: "M3 5v14a9 3 0 0 0 6.47 2.88" }],
  ["path", { d: "M12 12v4h4" }],
  ["path", { d: "M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16" }]
];

// node_modules/lucide/dist/esm/icons/decimals-arrow-left.js
var DecimalsArrowLeft = [
  ["path", { d: "m13 21-3-3 3-3" }],
  ["path", { d: "M20 18H10" }],
  ["path", { d: "M3 11h.01" }],
  ["rect", { x: "6", y: "3", width: "5", height: "8", rx: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/database.js
var Database = [
  ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
  ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
  ["path", { d: "M3 12A9 3 0 0 0 21 12" }]
];

// node_modules/lucide/dist/esm/icons/decimals-arrow-right.js
var DecimalsArrowRight = [
  ["path", { d: "M10 18h10" }],
  ["path", { d: "m17 21 3-3-3-3" }],
  ["path", { d: "M3 11h.01" }],
  ["rect", { x: "15", y: "3", width: "5", height: "8", rx: "2.5" }],
  ["rect", { x: "6", y: "3", width: "5", height: "8", rx: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/dessert.js
var Dessert = [
  [
    "path",
    {
      d: "M10.162 3.167A10 10 0 0 0 2 13a2 2 0 0 0 4 0v-1a2 2 0 0 1 4 0v4a2 2 0 0 0 4 0v-4a2 2 0 0 1 4 0v1a2 2 0 0 0 4-.006 10 10 0 0 0-8.161-9.826"
    }
  ],
  ["path", { d: "M20.804 14.869a9 9 0 0 1-17.608 0" }],
  ["circle", { cx: "12", cy: "4", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/delete.js
var Delete = [
  [
    "path",
    {
      d: "M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"
    }
  ],
  ["path", { d: "m12 9 6 6" }],
  ["path", { d: "m18 9-6 6" }]
];

// node_modules/lucide/dist/esm/icons/diameter.js
var Diameter = [
  ["circle", { cx: "19", cy: "19", r: "2" }],
  ["circle", { cx: "5", cy: "5", r: "2" }],
  ["path", { d: "M6.48 3.66a10 10 0 0 1 13.86 13.86" }],
  ["path", { d: "m6.41 6.41 11.18 11.18" }],
  ["path", { d: "M3.66 6.48a10 10 0 0 0 13.86 13.86" }]
];

// node_modules/lucide/dist/esm/icons/diamond-minus.js
var DiamondMinus = [
  [
    "path",
    {
      d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z"
    }
  ],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/diamond-percent.js
var DiamondPercent = [
  [
    "path",
    {
      d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0Z"
    }
  ],
  ["path", { d: "M9.2 9.2h.01" }],
  ["path", { d: "m14.5 9.5-5 5" }],
  ["path", { d: "M14.7 14.8h.01" }]
];

// node_modules/lucide/dist/esm/icons/diamond-plus.js
var DiamondPlus = [
  ["path", { d: "M12 8v8" }],
  [
    "path",
    {
      d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z"
    }
  ],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/diamond.js
var Diamond = [
  [
    "path",
    {
      d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/dice-1.js
var Dice1 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M12 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/dice-2.js
var Dice2 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M15 9h.01" }],
  ["path", { d: "M9 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/dice-3.js
var Dice3 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M16 8h.01" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M8 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/dice-4.js
var Dice4 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M16 8h.01" }],
  ["path", { d: "M8 8h.01" }],
  ["path", { d: "M8 16h.01" }],
  ["path", { d: "M16 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/dice-5.js
var Dice5 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M16 8h.01" }],
  ["path", { d: "M8 8h.01" }],
  ["path", { d: "M8 16h.01" }],
  ["path", { d: "M16 16h.01" }],
  ["path", { d: "M12 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/dices.js
var Dices = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2" }],
  ["path", { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "M10 14h.01" }],
  ["path", { d: "M15 6h.01" }],
  ["path", { d: "M18 9h.01" }]
];

// node_modules/lucide/dist/esm/icons/dice-6.js
var Dice6 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M16 8h.01" }],
  ["path", { d: "M16 12h.01" }],
  ["path", { d: "M16 16h.01" }],
  ["path", { d: "M8 8h.01" }],
  ["path", { d: "M8 12h.01" }],
  ["path", { d: "M8 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/diff.js
var Diff = [
  ["path", { d: "M12 3v14" }],
  ["path", { d: "M5 10h14" }],
  ["path", { d: "M5 21h14" }]
];

// node_modules/lucide/dist/esm/icons/disc-2.js
var Disc2 = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/disc-3.js
var Disc3 = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M6 12c0-1.7.7-3.2 1.8-4.2" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "M18 12c0 1.7-.7 3.2-1.8 4.2" }]
];

// node_modules/lucide/dist/esm/icons/disc-album.js
var DiscAlbum = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["circle", { cx: "12", cy: "12", r: "5" }],
  ["path", { d: "M12 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/disc.js
var Disc = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/divide.js
var Divide = [
  ["circle", { cx: "12", cy: "6", r: "1" }],
  ["line", { x1: "5", x2: "19", y1: "12", y2: "12" }],
  ["circle", { cx: "12", cy: "18", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/dna-off.js
var DnaOff = [
  ["path", { d: "M15 2c-1.35 1.5-2.092 3-2.5 4.5L14 8" }],
  ["path", { d: "m17 6-2.891-2.891" }],
  ["path", { d: "M2 15c3.333-3 6.667-3 10-3" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "m20 9 .891.891" }],
  ["path", { d: "M22 9c-1.5 1.35-3 2.092-4.5 2.5l-1-1" }],
  ["path", { d: "M3.109 14.109 4 15" }],
  ["path", { d: "m6.5 12.5 1 1" }],
  ["path", { d: "m7 18 2.891 2.891" }],
  ["path", { d: "M9 22c1.35-1.5 2.092-3 2.5-4.5L10 16" }]
];

// node_modules/lucide/dist/esm/icons/dna.js
var Dna = [
  ["path", { d: "m10 16 1.5 1.5" }],
  ["path", { d: "m14 8-1.5-1.5" }],
  ["path", { d: "M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" }],
  ["path", { d: "m16.5 10.5 1 1" }],
  ["path", { d: "m17 6-2.891-2.891" }],
  ["path", { d: "M2 15c6.667-6 13.333 0 20-6" }],
  ["path", { d: "m20 9 .891.891" }],
  ["path", { d: "M3.109 14.109 4 15" }],
  ["path", { d: "m6.5 12.5 1 1" }],
  ["path", { d: "m7 18 2.891 2.891" }],
  ["path", { d: "M9 22c1.798-1.998 2.518-3.995 2.807-5.993" }]
];

// node_modules/lucide/dist/esm/icons/dock.js
var Dock = [
  ["path", { d: "M2 8h20" }],
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M6 16h12" }]
];

// node_modules/lucide/dist/esm/icons/dog.js
var Dog = [
  ["path", { d: "M11.25 16.25h1.5L12 17z" }],
  ["path", { d: "M16 14v.5" }],
  [
    "path",
    {
      d: "M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309"
    }
  ],
  ["path", { d: "M8 14v.5" }],
  [
    "path",
    {
      d: "M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/dollar-sign.js
var DollarSign = [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }]
];

// node_modules/lucide/dist/esm/icons/donut.js
var Donut = [
  [
    "path",
    {
      d: "M20.5 10a2.5 2.5 0 0 1-2.4-3H18a2.95 2.95 0 0 1-2.6-4.4 10 10 0 1 0 6.3 7.1c-.3.2-.8.3-1.2.3"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/door-closed-locked.js
var DoorClosedLocked = [
  ["path", { d: "M10 12h.01" }],
  ["path", { d: "M18 9V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" }],
  ["path", { d: "M2 20h8" }],
  ["path", { d: "M20 17v-2a2 2 0 1 0-4 0v2" }],
  ["rect", { x: "14", y: "17", width: "8", height: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/door-closed.js
var DoorClosed = [
  ["path", { d: "M10 12h.01" }],
  ["path", { d: "M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" }],
  ["path", { d: "M2 20h20" }]
];

// node_modules/lucide/dist/esm/icons/door-open.js
var DoorOpen = [
  ["path", { d: "M11 20H2" }],
  [
    "path",
    {
      d: "M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"
    }
  ],
  ["path", { d: "M11 4H8a2 2 0 0 0-2 2v14" }],
  ["path", { d: "M14 12h.01" }],
  ["path", { d: "M22 20h-3" }]
];

// node_modules/lucide/dist/esm/icons/dot.js
var Dot = [["circle", { cx: "12.1", cy: "12.1", r: "1" }]];

// node_modules/lucide/dist/esm/icons/download.js
var Download = [
  ["path", { d: "M12 15V3" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
  ["path", { d: "m7 10 5 5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/drafting-compass.js
var DraftingCompass = [
  ["path", { d: "m12.99 6.74 1.93 3.44" }],
  ["path", { d: "M19.136 12a10 10 0 0 1-14.271 0" }],
  ["path", { d: "m21 21-2.16-3.84" }],
  ["path", { d: "m3 21 8.02-14.26" }],
  ["circle", { cx: "12", cy: "5", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/drama.js
var Drama = [
  ["path", { d: "M10 11h.01" }],
  ["path", { d: "M14 6h.01" }],
  ["path", { d: "M18 6h.01" }],
  ["path", { d: "M6.5 13.1h.01" }],
  ["path", { d: "M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3" }],
  ["path", { d: "M17.4 9.9c-.8.8-2 .8-2.8 0" }],
  [
    "path",
    {
      d: "M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"
    }
  ],
  ["path", { d: "M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4" }]
];

// node_modules/lucide/dist/esm/icons/dribbble.js
var Dribbble = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94" }],
  ["path", { d: "M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32" }],
  ["path", { d: "M8.56 2.75c4.37 6 6 9.42 8 17.72" }]
];

// node_modules/lucide/dist/esm/icons/drill.js
var Drill = [
  ["path", { d: "M10 18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3 1 1 0 0 1 1-1z" }],
  [
    "path",
    {
      d: "M13 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1l-.81 3.242a1 1 0 0 1-.97.758H8"
    }
  ],
  ["path", { d: "M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3" }],
  ["path", { d: "M18 6h4" }],
  ["path", { d: "m5 10-2 8" }],
  ["path", { d: "m7 18 2-8" }]
];

// node_modules/lucide/dist/esm/icons/drone.js
var Drone = [
  ["path", { d: "M10 10 7 7" }],
  ["path", { d: "m10 14-3 3" }],
  ["path", { d: "m14 10 3-3" }],
  ["path", { d: "m14 14 3 3" }],
  ["path", { d: "M14.205 4.139a4 4 0 1 1 5.439 5.863" }],
  ["path", { d: "M19.637 14a4 4 0 1 1-5.432 5.868" }],
  ["path", { d: "M4.367 10a4 4 0 1 1 5.438-5.862" }],
  ["path", { d: "M9.795 19.862a4 4 0 1 1-5.429-5.873" }],
  ["rect", { x: "10", y: "8", width: "4", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/droplet-off.js
var DropletOff = [
  [
    "path",
    {
      d: "M18.715 13.186C18.29 11.858 17.384 10.607 16 9.5c-2-1.6-3.5-4-4-6.5a10.7 10.7 0 0 1-.884 2.586"
    }
  ],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.795 8.797A11 11 0 0 1 8 9.5C6 11.1 5 13 5 15a7 7 0 0 0 13.222 3.208" }]
];

// node_modules/lucide/dist/esm/icons/droplet.js
var Droplet = [
  [
    "path",
    {
      d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/drum.js
var Drum = [
  ["path", { d: "m2 2 8 8" }],
  ["path", { d: "m22 2-8 8" }],
  ["ellipse", { cx: "12", cy: "9", rx: "10", ry: "5" }],
  ["path", { d: "M7 13.4v7.9" }],
  ["path", { d: "M12 14v8" }],
  ["path", { d: "M17 13.4v7.9" }],
  ["path", { d: "M2 9v8a10 5 0 0 0 20 0V9" }]
];

// node_modules/lucide/dist/esm/icons/droplets.js
var Droplets = [
  [
    "path",
    {
      d: "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"
    }
  ],
  [
    "path",
    {
      d: "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/drumstick.js
var Drumstick = [
  ["path", { d: "M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" }],
  ["path", { d: "m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" }]
];

// node_modules/lucide/dist/esm/icons/dumbbell.js
var Dumbbell = [
  [
    "path",
    {
      d: "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"
    }
  ],
  ["path", { d: "m2.5 21.5 1.4-1.4" }],
  ["path", { d: "m20.1 3.9 1.4-1.4" }],
  [
    "path",
    {
      d: "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"
    }
  ],
  ["path", { d: "m9.6 14.4 4.8-4.8" }]
];

// node_modules/lucide/dist/esm/icons/ear-off.js
var EarOff = [
  ["path", { d: "M6 18.5a3.5 3.5 0 1 0 7 0c0-1.57.92-2.52 2.04-3.46" }],
  ["path", { d: "M6 8.5c0-.75.13-1.47.36-2.14" }],
  ["path", { d: "M8.8 3.15A6.5 6.5 0 0 1 19 8.5c0 1.63-.44 2.81-1.09 3.76" }],
  ["path", { d: "M12.5 6A2.5 2.5 0 0 1 15 8.5M10 13a2 2 0 0 0 1.82-1.18" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/earth-lock.js
var EarthLock = [
  ["path", { d: "M7 3.34V5a3 3 0 0 0 3 3" }],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2 2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" }],
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54" }],
  ["path", { d: "M12 2a10 10 0 1 0 9.54 13" }],
  ["path", { d: "M20 6V4a2 2 0 1 0-4 0v2" }],
  ["rect", { width: "8", height: "5", x: "14", y: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/ear.js
var Ear = [
  ["path", { d: "M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" }],
  ["path", { d: "M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" }]
];

// node_modules/lucide/dist/esm/icons/earth.js
var Earth = [
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54" }],
  [
    "path",
    { d: "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" }
  ],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/eclipse.js
var Eclipse = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 2a7 7 0 1 0 10 10" }]
];

// node_modules/lucide/dist/esm/icons/egg-fried.js
var EggFried = [
  ["circle", { cx: "11.5", cy: "12.5", r: "3.5" }],
  [
    "path",
    {
      d: "M3 8c0-3.5 2.5-6 6.5-6 5 0 4.83 3 7.5 5s5 2 5 6c0 4.5-2.5 6.5-7 6.5-2.5 0-2.5 2.5-6 2.5s-7-2-7-5.5c0-3 1.5-3 1.5-5C3.5 10 3 9 3 8Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/egg-off.js
var EggOff = [
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20 14.347V14c0-6-4-12-8-12-1.078 0-2.157.436-3.157 1.19" }],
  ["path", { d: "M6.206 6.21C4.871 8.4 4 11.2 4 14a8 8 0 0 0 14.568 4.568" }]
];

// node_modules/lucide/dist/esm/icons/egg.js
var Egg = [["path", { d: "M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12" }]];

// node_modules/lucide/dist/esm/icons/ellipsis-vertical.js
var EllipsisVertical = [
  ["circle", { cx: "12", cy: "12", r: "1" }],
  ["circle", { cx: "12", cy: "5", r: "1" }],
  ["circle", { cx: "12", cy: "19", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/ellipsis.js
var Ellipsis = [
  ["circle", { cx: "12", cy: "12", r: "1" }],
  ["circle", { cx: "19", cy: "12", r: "1" }],
  ["circle", { cx: "5", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/equal-approximately.js
var EqualApproximately = [
  ["path", { d: "M5 15a6.5 6.5 0 0 1 7 0 6.5 6.5 0 0 0 7 0" }],
  ["path", { d: "M5 9a6.5 6.5 0 0 1 7 0 6.5 6.5 0 0 0 7 0" }]
];

// node_modules/lucide/dist/esm/icons/equal-not.js
var EqualNot = [
  ["line", { x1: "5", x2: "19", y1: "9", y2: "9" }],
  ["line", { x1: "5", x2: "19", y1: "15", y2: "15" }],
  ["line", { x1: "19", x2: "5", y1: "5", y2: "19" }]
];

// node_modules/lucide/dist/esm/icons/equal.js
var Equal = [
  ["line", { x1: "5", x2: "19", y1: "9", y2: "9" }],
  ["line", { x1: "5", x2: "19", y1: "15", y2: "15" }]
];

// node_modules/lucide/dist/esm/icons/eraser.js
var Eraser = [
  [
    "path",
    {
      d: "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"
    }
  ],
  ["path", { d: "m5.082 11.09 8.828 8.828" }]
];

// node_modules/lucide/dist/esm/icons/ethernet-port.js
var EthernetPort = [
  [
    "path",
    { d: "m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z" }
  ],
  ["path", { d: "M6 8v1" }],
  ["path", { d: "M10 8v1" }],
  ["path", { d: "M14 8v1" }],
  ["path", { d: "M18 8v1" }]
];

// node_modules/lucide/dist/esm/icons/euro.js
var Euro = [
  ["path", { d: "M4 10h12" }],
  ["path", { d: "M4 14h9" }],
  [
    "path",
    { d: "M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" }
  ]
];

// node_modules/lucide/dist/esm/icons/ev-charger.js
var EvCharger = [
  ["path", { d: "M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" }],
  ["path", { d: "M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" }],
  ["path", { d: "M2 21h13" }],
  ["path", { d: "M3 7h11" }],
  ["path", { d: "m9 11-2 3h3l-2 3" }]
];

// node_modules/lucide/dist/esm/icons/expand.js
var Expand = [
  ["path", { d: "m15 15 6 6" }],
  ["path", { d: "m15 9 6-6" }],
  ["path", { d: "M21 16v5h-5" }],
  ["path", { d: "M21 8V3h-5" }],
  ["path", { d: "M3 16v5h5" }],
  ["path", { d: "m3 21 6-6" }],
  ["path", { d: "M3 8V3h5" }],
  ["path", { d: "M9 9 3 3" }]
];

// node_modules/lucide/dist/esm/icons/eye-closed.js
var EyeClosed = [
  ["path", { d: "m15 18-.722-3.25" }],
  ["path", { d: "M2 8a10.645 10.645 0 0 0 20 0" }],
  ["path", { d: "m20 15-1.726-2.05" }],
  ["path", { d: "m4 15 1.726-2.05" }],
  ["path", { d: "m9 18 .722-3.25" }]
];

// node_modules/lucide/dist/esm/icons/eye-off.js
var EyeOff = [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"
    }
  ],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/external-link.js
var ExternalLink = [
  ["path", { d: "M15 3h6v6" }],
  ["path", { d: "M10 14 21 3" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }]
];

// node_modules/lucide/dist/esm/icons/eye.js
var Eye = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/facebook.js
var Facebook = [
  ["path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" }]
];

// node_modules/lucide/dist/esm/icons/factory.js
var Factory = [
  ["path", { d: "M12 16h.01" }],
  ["path", { d: "M16 16h.01" }],
  [
    "path",
    {
      d: "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"
    }
  ],
  ["path", { d: "M8 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/fan.js
var Fan = [
  [
    "path",
    {
      d: "M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"
    }
  ],
  ["path", { d: "M12 12v.01" }]
];

// node_modules/lucide/dist/esm/icons/fast-forward.js
var FastForward = [
  ["path", { d: "M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z" }],
  ["path", { d: "M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z" }]
];

// node_modules/lucide/dist/esm/icons/feather.js
var Feather = [
  [
    "path",
    {
      d: "M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"
    }
  ],
  ["path", { d: "M16 8 2 22" }],
  ["path", { d: "M17.5 15H9" }]
];

// node_modules/lucide/dist/esm/icons/fence.js
var Fence = [
  ["path", { d: "M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" }],
  ["path", { d: "M6 8h4" }],
  ["path", { d: "M6 18h4" }],
  ["path", { d: "m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" }],
  ["path", { d: "M14 8h4" }],
  ["path", { d: "M14 18h4" }],
  ["path", { d: "m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" }]
];

// node_modules/lucide/dist/esm/icons/ferris-wheel.js
var FerrisWheel = [
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "M12 2v4" }],
  ["path", { d: "m6.8 15-3.5 2" }],
  ["path", { d: "m20.7 7-3.5 2" }],
  ["path", { d: "M6.8 9 3.3 7" }],
  ["path", { d: "m20.7 17-3.5-2" }],
  ["path", { d: "m9 22 3-8 3 8" }],
  ["path", { d: "M8 22h8" }],
  ["path", { d: "M18 18.7a9 9 0 1 0-12 0" }]
];

// node_modules/lucide/dist/esm/icons/figma.js
var Figma = [
  ["path", { d: "M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" }],
  ["path", { d: "M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" }],
  ["path", { d: "M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" }],
  ["path", { d: "M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" }],
  ["path", { d: "M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" }]
];

// node_modules/lucide/dist/esm/icons/file-archive.js
var FileArchive = [
  ["path", { d: "M10 12v-1" }],
  ["path", { d: "M10 18v-2" }],
  ["path", { d: "M10 7V6" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 .274 1.01" }],
  ["circle", { cx: "10", cy: "20", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/file-audio-2.js
var FileAudio2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["circle", { cx: "3", cy: "17", r: "1" }],
  ["path", { d: "M2 17v-3a4 4 0 0 1 8 0v3" }],
  ["circle", { cx: "9", cy: "17", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/file-audio.js
var FileAudio = [
  ["path", { d: "M17.5 22h.5a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    { d: "M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0" }
  ]
];

// node_modules/lucide/dist/esm/icons/file-badge-2.js
var FileBadge2 = [
  [
    "path",
    {
      d: "m13.69 12.479 1.29 4.88a.5.5 0 0 1-.697.591l-1.844-.849a1 1 0 0 0-.88.001l-1.846.85a.5.5 0 0 1-.693-.593l1.29-4.88"
    }
  ],
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }],
  ["circle", { cx: "12", cy: "10", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/file-axis-3d.js
var FileAxis3d = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m8 18 4-4" }],
  ["path", { d: "M8 10v8h8" }]
];

// node_modules/lucide/dist/esm/icons/file-box.js
var FileBox = [
  ["path", { d: "M14.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    {
      d: "M3 13.1a2 2 0 0 0-1 1.76v3.24a2 2 0 0 0 .97 1.78L6 21.7a2 2 0 0 0 2.03.01L11 19.9a2 2 0 0 0 1-1.76V14.9a2 2 0 0 0-.97-1.78L8 11.3a2 2 0 0 0-2.03-.01Z"
    }
  ],
  ["path", { d: "M7 17v5" }],
  ["path", { d: "M11.7 14.2 7 17l-4.7-2.8" }]
];

// node_modules/lucide/dist/esm/icons/file-badge.js
var FileBadge = [
  ["path", { d: "M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3.072" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    {
      d: "m6.69 16.479 1.29 4.88a.5.5 0 0 1-.698.591l-1.843-.849a1 1 0 0 0-.88.001l-1.846.85a.5.5 0 0 1-.693-.593l1.29-4.88"
    }
  ],
  ["circle", { cx: "5", cy: "14", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/file-chart-column-increasing.js
var FileChartColumnIncreasing = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 18v-2" }],
  ["path", { d: "M12 18v-4" }],
  ["path", { d: "M16 18v-6" }]
];

// node_modules/lucide/dist/esm/icons/file-chart-column.js
var FileChartColumn = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 18v-1" }],
  ["path", { d: "M12 18v-6" }],
  ["path", { d: "M16 18v-3" }]
];

// node_modules/lucide/dist/esm/icons/file-chart-pie.js
var FileChartPie = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3.5" }],
  ["path", { d: "M4.017 11.512a6 6 0 1 0 8.466 8.475" }],
  [
    "path",
    {
      d: "M9 16a1 1 0 0 1-1-1v-4c0-.552.45-1.008.995-.917a6 6 0 0 1 4.922 4.922c.091.544-.365.995-.917.995z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/file-chart-line.js
var FileChartLine = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m16 13-3.5 3.5-2-2L8 17" }]
];

// node_modules/lucide/dist/esm/icons/file-check-2.js
var FileCheck2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m3 15 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/file-check.js
var FileCheck = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m9 15 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/file-clock.js
var FileClock = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M8 14v2.2l1.6 1" }],
  ["circle", { cx: "8", cy: "16", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/file-code-2.js
var FileCode2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m5 12-3 3 3 3" }],
  ["path", { d: "m9 18 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/file-code.js
var FileCode = [
  ["path", { d: "M10 12.5 8 15l2 2.5" }],
  ["path", { d: "m14 12.5 2 2.5-2 2.5" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }]
];

// node_modules/lucide/dist/esm/icons/file-cog.js
var FileCog = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m2.305 15.53.923-.382" }],
  ["path", { d: "m3.228 12.852-.924-.383" }],
  ["path", { d: "M4.677 21.5a2 2 0 0 0 1.313.5H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2.5" }],
  ["path", { d: "m4.852 11.228-.383-.923" }],
  ["path", { d: "m4.852 16.772-.383.924" }],
  ["path", { d: "m7.148 11.228.383-.923" }],
  ["path", { d: "m7.53 17.696-.382-.924" }],
  ["path", { d: "m8.772 12.852.923-.383" }],
  ["path", { d: "m8.772 15.148.923.383" }],
  ["circle", { cx: "6", cy: "14", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/file-diff.js
var FileDiff = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M9 10h6" }],
  ["path", { d: "M12 13V7" }],
  ["path", { d: "M9 17h6" }]
];

// node_modules/lucide/dist/esm/icons/file-digit.js
var FileDigit = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["rect", { width: "4", height: "6", x: "2", y: "12", rx: "2" }],
  ["path", { d: "M10 12h2v6" }],
  ["path", { d: "M10 18h4" }]
];

// node_modules/lucide/dist/esm/icons/file-down.js
var FileDown = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M12 18v-6" }],
  ["path", { d: "m9 15 3 3 3-3" }]
];

// node_modules/lucide/dist/esm/icons/file-heart.js
var FileHeart = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    {
      d: "M2.62 13.8A2.25 2.25 0 1 1 6 10.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
    }
  ],
  ["path", { d: "M4 6.005V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-1.9-1.376" }]
];

// node_modules/lucide/dist/esm/icons/file-image.js
var FileImage = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["circle", { cx: "10", cy: "12", r: "2" }],
  ["path", { d: "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" }]
];

// node_modules/lucide/dist/esm/icons/file-input.js
var FileInput = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M2 15h10" }],
  ["path", { d: "m9 18 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/file-json-2.js
var FileJson2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M4 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" }],
  ["path", { d: "M8 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" }]
];

// node_modules/lucide/dist/esm/icons/file-json.js
var FileJson = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" }],
  ["path", { d: "M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" }]
];

// node_modules/lucide/dist/esm/icons/file-key-2.js
var FileKey2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v6" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["circle", { cx: "4", cy: "16", r: "2" }],
  ["path", { d: "m10 10-4.5 4.5" }],
  ["path", { d: "m9 11 1 1" }]
];

// node_modules/lucide/dist/esm/icons/file-key.js
var FileKey = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["circle", { cx: "10", cy: "16", r: "2" }],
  ["path", { d: "m16 10-4.5 4.5" }],
  ["path", { d: "m15 11 1 1" }]
];

// node_modules/lucide/dist/esm/icons/file-lock-2.js
var FileLock2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["rect", { width: "8", height: "5", x: "2", y: "13", rx: "1" }],
  ["path", { d: "M8 13v-2a2 2 0 1 0-4 0v2" }]
];

// node_modules/lucide/dist/esm/icons/file-lock.js
var FileLock = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["rect", { width: "8", height: "6", x: "8", y: "12", rx: "1" }],
  ["path", { d: "M10 12v-2a2 2 0 1 1 4 0v2" }]
];

// node_modules/lucide/dist/esm/icons/file-minus.js
var FileMinus = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M9 15h6" }]
];

// node_modules/lucide/dist/esm/icons/file-minus-2.js
var FileMinus2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M3 15h6" }]
];

// node_modules/lucide/dist/esm/icons/file-music.js
var FileMusic = [
  ["path", { d: "M10.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v8.4" }],
  ["path", { d: "M8 18v-7.7L16 9v7" }],
  ["circle", { cx: "14", cy: "16", r: "2" }],
  ["circle", { cx: "6", cy: "18", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/file-output.js
var FileOutput = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M4 7V4a2 2 0 0 1 2-2 2 2 0 0 0-2 2" }],
  ["path", { d: "M4.063 20.999a2 2 0 0 0 2 1L18 22a2 2 0 0 0 2-2V7l-5-5H6" }],
  ["path", { d: "m5 11-3 3" }],
  ["path", { d: "m5 17-3-3h10" }]
];

// node_modules/lucide/dist/esm/icons/file-pen-line.js
var FilePenLine = [
  [
    "path",
    { d: "m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" }
  ],
  [
    "path",
    {
      d: "M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ],
  ["path", { d: "M8 18h1" }]
];

// node_modules/lucide/dist/esm/icons/file-pen.js
var FilePen = [
  ["path", { d: "M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    {
      d: "M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/file-play.js
var FilePlay = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }],
  [
    "path",
    {
      d: "M15.033 13.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56v-4.704a.645.645 0 0 1 .967-.56z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/file-plus.js
var FilePlus = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M9 15h6" }],
  ["path", { d: "M12 18v-6" }]
];

// node_modules/lucide/dist/esm/icons/file-plus-2.js
var FilePlus2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M3 15h6" }],
  ["path", { d: "M6 12v6" }]
];

// node_modules/lucide/dist/esm/icons/file-question-mark.js
var FileQuestionMark = [
  ["path", { d: "M12 17h.01" }],
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }],
  ["path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/file-scan.js
var FileScan = [
  ["path", { d: "M20 10V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M16 14a2 2 0 0 0-2 2" }],
  ["path", { d: "M20 14a2 2 0 0 1 2 2" }],
  ["path", { d: "M20 22a2 2 0 0 0 2-2" }],
  ["path", { d: "M16 22a2 2 0 0 1-2-2" }]
];

// node_modules/lucide/dist/esm/icons/file-search-2.js
var FileSearch2 = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["circle", { cx: "11.5", cy: "14.5", r: "2.5" }],
  ["path", { d: "M13.3 16.3 15 18" }]
];

// node_modules/lucide/dist/esm/icons/file-search.js
var FileSearch = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" }],
  ["path", { d: "m9 18-1.5-1.5" }],
  ["circle", { cx: "5", cy: "14", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/file-sliders.js
var FileSliders = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "M10 11v2" }],
  ["path", { d: "M8 17h8" }],
  ["path", { d: "M14 16v2" }]
];

// node_modules/lucide/dist/esm/icons/file-spreadsheet.js
var FileSpreadsheet = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 13h2" }],
  ["path", { d: "M14 13h2" }],
  ["path", { d: "M8 17h2" }],
  ["path", { d: "M14 17h2" }]
];

// node_modules/lucide/dist/esm/icons/file-stack.js
var FileStack = [
  ["path", { d: "M11 21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1" }],
  ["path", { d: "M16 16a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1" }],
  [
    "path",
    {
      d: "M21 6a2 2 0 0 0-.586-1.414l-2-2A2 2 0 0 0 17 2h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/file-symlink.js
var FileSymlink = [
  ["path", { d: "m10 18 3-3-3-3" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  [
    "path",
    { d: "M4 11V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7" }
  ]
];

// node_modules/lucide/dist/esm/icons/file-terminal.js
var FileTerminal = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m8 16 2-2-2-2" }],
  ["path", { d: "M12 18h4" }]
];

// node_modules/lucide/dist/esm/icons/file-text.js
var FileText = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M10 9H8" }],
  ["path", { d: "M16 13H8" }],
  ["path", { d: "M16 17H8" }]
];

// node_modules/lucide/dist/esm/icons/file-type-2.js
var FileType2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M2 13v-1h6v1" }],
  ["path", { d: "M5 12v6" }],
  ["path", { d: "M4 18h2" }]
];

// node_modules/lucide/dist/esm/icons/file-type.js
var FileType = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M9 13v-1h6v1" }],
  ["path", { d: "M12 12v6" }],
  ["path", { d: "M11 18h2" }]
];

// node_modules/lucide/dist/esm/icons/file-up.js
var FileUp = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M12 12v6" }],
  ["path", { d: "m15 15-3-3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/file-user.js
var FileUser = [
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M15 18a3 3 0 1 0-6 0" }],
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" }],
  ["circle", { cx: "12", cy: "13", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/file-video-camera.js
var FileVideoCamera = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["rect", { width: "8", height: "6", x: "2", y: "12", rx: "1" }],
  [
    "path",
    { d: "m10 13.843 3.033-1.755a.645.645 0 0 1 .967.56v4.704a.645.645 0 0 1-.967.56L10 16.157" }
  ]
];

// node_modules/lucide/dist/esm/icons/file-volume-2.js
var FileVolume2 = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 15h.01" }],
  ["path", { d: "M11.5 13.5a2.5 2.5 0 0 1 0 3" }],
  ["path", { d: "M15 12a5 5 0 0 1 0 6" }]
];

// node_modules/lucide/dist/esm/icons/file-volume.js
var FileVolume = [
  ["path", { d: "M11 11a5 5 0 0 1 0 6" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M4 6.765V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-.93-.23" }],
  [
    "path",
    {
      d: "M7 10.51a.5.5 0 0 0-.826-.38l-1.893 1.628A1 1 0 0 1 3.63 12H2.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1.129a1 1 0 0 1 .652.242l1.893 1.63a.5.5 0 0 0 .826-.38z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/file-warning.js
var FileWarning = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/file-x-2.js
var FileX2 = [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m8 12.5-5 5" }],
  ["path", { d: "m3 12.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/file-x.js
var FileX = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "m14.5 12.5-5 5" }],
  ["path", { d: "m9.5 12.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/files.js
var Files = [
  [
    "path",
    {
      d: "M15 2a2 2 0 0 1 1.414.586l4 4A2 2 0 0 1 21 8v7a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
    }
  ],
  ["path", { d: "M15 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1" }]
];

// node_modules/lucide/dist/esm/icons/file.js
var File = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }]
];

// node_modules/lucide/dist/esm/icons/film.js
var Film = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 3v18" }],
  ["path", { d: "M3 7.5h4" }],
  ["path", { d: "M3 12h18" }],
  ["path", { d: "M3 16.5h4" }],
  ["path", { d: "M17 3v18" }],
  ["path", { d: "M17 7.5h4" }],
  ["path", { d: "M17 16.5h4" }]
];

// node_modules/lucide/dist/esm/icons/fingerprint.js
var Fingerprint = [
  ["path", { d: "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" }],
  ["path", { d: "M14 13.12c0 2.38 0 6.38-1 8.88" }],
  ["path", { d: "M17.29 21.02c.12-.6.43-2.3.5-3.02" }],
  ["path", { d: "M2 12a10 10 0 0 1 18-6" }],
  ["path", { d: "M2 16h.01" }],
  ["path", { d: "M21.8 16c.2-2 .131-5.354 0-6" }],
  ["path", { d: "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" }],
  ["path", { d: "M8.65 22c.21-.66.45-1.32.57-2" }],
  ["path", { d: "M9 6.8a6 6 0 0 1 9 5.2v2" }]
];

// node_modules/lucide/dist/esm/icons/fire-extinguisher.js
var FireExtinguisher = [
  ["path", { d: "M15 6.5V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3.5" }],
  ["path", { d: "M9 18h8" }],
  ["path", { d: "M18 3h-3" }],
  ["path", { d: "M11 3a6 6 0 0 0-6 6v11" }],
  ["path", { d: "M5 13h4" }],
  ["path", { d: "M17 10a4 4 0 0 0-8 0v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2Z" }]
];

// node_modules/lucide/dist/esm/icons/fish-off.js
var FishOff = [
  [
    "path",
    {
      d: "M18 12.47v.03m0-.5v.47m-.475 5.056A6.744 6.744 0 0 1 15 18c-3.56 0-7.56-2.53-8.5-6 .348-1.28 1.114-2.433 2.121-3.38m3.444-2.088A8.802 8.802 0 0 1 15 6c3.56 0 6.06 2.54 7 6-.309 1.14-.786 2.177-1.413 3.058"
    }
  ],
  [
    "path",
    {
      d: "M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33m7.48-4.372A9.77 9.77 0 0 1 16 6.07m0 11.86a9.77 9.77 0 0 1-1.728-3.618"
    }
  ],
  [
    "path",
    {
      d: "m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98M8.53 3h5.27a2 2 0 0 1 1.98 1.67l.23 1.4M2 2l20 20"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/fish-symbol.js
var FishSymbol = [["path", { d: "M2 16s9-15 20-4C11 23 2 8 2 8" }]];

// node_modules/lucide/dist/esm/icons/flag-off.js
var FlagOff = [
  ["path", { d: "M16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M4 22V4" }],
  ["path", { d: "M7.656 2H8c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10.347" }]
];

// node_modules/lucide/dist/esm/icons/fish.js
var Fish = [
  [
    "path",
    {
      d: "M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"
    }
  ],
  ["path", { d: "M18 12v.5" }],
  ["path", { d: "M16 17.93a9.77 9.77 0 0 1 0-11.86" }],
  [
    "path",
    {
      d: "M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"
    }
  ],
  ["path", { d: "M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" }],
  ["path", { d: "m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" }]
];

// node_modules/lucide/dist/esm/icons/flag-triangle-left.js
var FlagTriangleLeft = [
  ["path", { d: "M18 22V2.8a.8.8 0 0 0-1.17-.71L5.45 7.78a.8.8 0 0 0 0 1.44L18 15.5" }]
];

// node_modules/lucide/dist/esm/icons/flag-triangle-right.js
var FlagTriangleRight = [
  ["path", { d: "M6 22V2.8a.8.8 0 0 1 1.17-.71l11.38 5.69a.8.8 0 0 1 0 1.44L6 15.5" }]
];

// node_modules/lucide/dist/esm/icons/flag.js
var Flag = [
  [
    "path",
    {
      d: "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/flame-kindling.js
var FlameKindling = [
  [
    "path",
    {
      d: "M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-.3 0-.6.1-.9a2 2 0 1 0 3.3-2C8 4.5 11 2 12 2Z"
    }
  ],
  ["path", { d: "m5 22 14-4" }],
  ["path", { d: "m5 18 14 4" }]
];

// node_modules/lucide/dist/esm/icons/flame.js
var Flame = [
  [
    "path",
    {
      d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/flashlight-off.js
var FlashlightOff = [
  ["path", { d: "M16 16v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4" }],
  ["path", { d: "M7 2h11v4c0 2-2 2-2 4v1" }],
  ["line", { x1: "11", x2: "18", y1: "6", y2: "6" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/flashlight.js
var Flashlight = [
  ["path", { d: "M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z" }],
  ["line", { x1: "6", x2: "18", y1: "6", y2: "6" }],
  ["line", { x1: "12", x2: "12", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/flask-conical-off.js
var FlaskConicalOff = [
  ["path", { d: "M10 2v2.343" }],
  ["path", { d: "M14 2v6.343" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20 20a2 2 0 0 1-2 2H6a2 2 0 0 1-1.755-2.96l5.227-9.563" }],
  ["path", { d: "M6.453 15H15" }],
  ["path", { d: "M8.5 2h7" }]
];

// node_modules/lucide/dist/esm/icons/flask-conical.js
var FlaskConical = [
  [
    "path",
    {
      d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"
    }
  ],
  ["path", { d: "M6.453 15h11.094" }],
  ["path", { d: "M8.5 2h7" }]
];

// node_modules/lucide/dist/esm/icons/flask-round.js
var FlaskRound = [
  ["path", { d: "M10 2v6.292a7 7 0 1 0 4 0V2" }],
  ["path", { d: "M5 15h14" }],
  ["path", { d: "M8.5 2h7" }]
];

// node_modules/lucide/dist/esm/icons/flip-horizontal-2.js
var FlipHorizontal2 = [
  ["path", { d: "m3 7 5 5-5 5V7" }],
  ["path", { d: "m21 7-5 5 5 5V7" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "M12 14v2" }],
  ["path", { d: "M12 8v2" }],
  ["path", { d: "M12 2v2" }]
];

// node_modules/lucide/dist/esm/icons/flip-horizontal.js
var FlipHorizontal = [
  ["path", { d: "M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" }],
  ["path", { d: "M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "M12 14v2" }],
  ["path", { d: "M12 8v2" }],
  ["path", { d: "M12 2v2" }]
];

// node_modules/lucide/dist/esm/icons/flip-vertical-2.js
var FlipVertical2 = [
  ["path", { d: "m17 3-5 5-5-5h10" }],
  ["path", { d: "m17 21-5-5-5 5h10" }],
  ["path", { d: "M4 12H2" }],
  ["path", { d: "M10 12H8" }],
  ["path", { d: "M16 12h-2" }],
  ["path", { d: "M22 12h-2" }]
];

// node_modules/lucide/dist/esm/icons/flip-vertical.js
var FlipVertical = [
  ["path", { d: "M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" }],
  ["path", { d: "M4 12H2" }],
  ["path", { d: "M10 12H8" }],
  ["path", { d: "M16 12h-2" }],
  ["path", { d: "M22 12h-2" }]
];

// node_modules/lucide/dist/esm/icons/flower-2.js
var Flower2 = [
  [
    "path",
    {
      d: "M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "2" }],
  ["path", { d: "M12 10v12" }],
  ["path", { d: "M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" }],
  ["path", { d: "M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" }]
];

// node_modules/lucide/dist/esm/icons/flower.js
var Flower = [
  ["circle", { cx: "12", cy: "12", r: "3" }],
  [
    "path",
    {
      d: "M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"
    }
  ],
  ["path", { d: "M12 7.5V9" }],
  ["path", { d: "M7.5 12H9" }],
  ["path", { d: "M16.5 12H15" }],
  ["path", { d: "M12 16.5V15" }],
  ["path", { d: "m8 8 1.88 1.88" }],
  ["path", { d: "M14.12 9.88 16 8" }],
  ["path", { d: "m8 16 1.88-1.88" }],
  ["path", { d: "M14.12 14.12 16 16" }]
];

// node_modules/lucide/dist/esm/icons/focus.js
var Focus = [
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]
];

// node_modules/lucide/dist/esm/icons/fold-horizontal.js
var FoldHorizontal = [
  ["path", { d: "M2 12h6" }],
  ["path", { d: "M22 12h-6" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 8v2" }],
  ["path", { d: "M12 14v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m19 9-3 3 3 3" }],
  ["path", { d: "m5 15 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/fold-vertical.js
var FoldVertical = [
  ["path", { d: "M12 22v-6" }],
  ["path", { d: "M12 8V2" }],
  ["path", { d: "M4 12H2" }],
  ["path", { d: "M10 12H8" }],
  ["path", { d: "M16 12h-2" }],
  ["path", { d: "M22 12h-2" }],
  ["path", { d: "m15 19-3-3-3 3" }],
  ["path", { d: "m15 5-3 3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/folder-archive.js
var FolderArchive = [
  ["circle", { cx: "15", cy: "19", r: "2" }],
  [
    "path",
    {
      d: "M20.9 19.8A2 2 0 0 0 22 18V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h5.1"
    }
  ],
  ["path", { d: "M15 11v-1" }],
  ["path", { d: "M15 17v-2" }]
];

// node_modules/lucide/dist/esm/icons/folder-check.js
var FolderCheck = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "m9 13 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/folder-clock.js
var FolderClock = [
  ["path", { d: "M16 14v2.2l1.6 1" }],
  [
    "path",
    {
      d: "M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2"
    }
  ],
  ["circle", { cx: "16", cy: "16", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/folder-closed.js
var FolderClosed = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "M2 10h20" }]
];

// node_modules/lucide/dist/esm/icons/folder-code.js
var FolderCode = [
  ["path", { d: "M10 10.5 8 13l2 2.5" }],
  ["path", { d: "m14 10.5 2 2.5-2 2.5" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-cog.js
var FolderCog = [
  [
    "path",
    {
      d: "M10.3 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.98a2 2 0 0 1 1.69.9l.66 1.2A2 2 0 0 0 12 6h8a2 2 0 0 1 2 2v3.3"
    }
  ],
  ["path", { d: "m14.305 19.53.923-.382" }],
  ["path", { d: "m15.228 16.852-.923-.383" }],
  ["path", { d: "m16.852 15.228-.383-.923" }],
  ["path", { d: "m16.852 20.772-.383.924" }],
  ["path", { d: "m19.148 15.228.383-.923" }],
  ["path", { d: "m19.53 21.696-.382-.924" }],
  ["path", { d: "m20.772 16.852.924-.383" }],
  ["path", { d: "m20.772 19.148.924.383" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/folder-dot.js
var FolderDot = [
  [
    "path",
    {
      d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/folder-git-2.js
var FolderGit2 = [
  [
    "path",
    {
      d: "M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"
    }
  ],
  ["circle", { cx: "13", cy: "12", r: "2" }],
  ["path", { d: "M18 19c-2.8 0-5-2.2-5-5v8" }],
  ["circle", { cx: "20", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/folder-down.js
var FolderDown = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "M12 10v6" }],
  ["path", { d: "m15 13-3 3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/folder-git.js
var FolderGit = [
  ["circle", { cx: "12", cy: "13", r: "2" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "M14 13h3" }],
  ["path", { d: "M7 13h3" }]
];

// node_modules/lucide/dist/esm/icons/folder-heart.js
var FolderHeart = [
  [
    "path",
    {
      d: "M10.638 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3.417"
    }
  ],
  [
    "path",
    {
      d: "M14.62 18.8A2.25 2.25 0 1 1 18 15.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-input.js
var FolderInput = [
  [
    "path",
    {
      d: "M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"
    }
  ],
  ["path", { d: "M2 13h10" }],
  ["path", { d: "m9 16 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/folder-kanban.js
var FolderKanban = [
  [
    "path",
    {
      d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
    }
  ],
  ["path", { d: "M8 10v4" }],
  ["path", { d: "M12 10v2" }],
  ["path", { d: "M16 10v6" }]
];

// node_modules/lucide/dist/esm/icons/folder-key.js
var FolderKey = [
  ["circle", { cx: "16", cy: "20", r: "2" }],
  [
    "path",
    {
      d: "M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"
    }
  ],
  ["path", { d: "m22 14-4.5 4.5" }],
  ["path", { d: "m21 15 1 1" }]
];

// node_modules/lucide/dist/esm/icons/folder-lock.js
var FolderLock = [
  ["rect", { width: "8", height: "5", x: "14", y: "17", rx: "1" }],
  [
    "path",
    {
      d: "M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2.5"
    }
  ],
  ["path", { d: "M20 17v-2a2 2 0 1 0-4 0v2" }]
];

// node_modules/lucide/dist/esm/icons/folder-minus.js
var FolderMinus = [
  ["path", { d: "M9 13h6" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-open-dot.js
var FolderOpenDot = [
  [
    "path",
    {
      d: "m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"
    }
  ],
  ["circle", { cx: "14", cy: "15", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/folder-open.js
var FolderOpen = [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-output.js
var FolderOutput = [
  [
    "path",
    {
      d: "M2 7.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-1.5"
    }
  ],
  ["path", { d: "M2 13h10" }],
  ["path", { d: "m5 10-3 3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/folder-pen.js
var FolderPen = [
  [
    "path",
    {
      d: "M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"
    }
  ],
  [
    "path",
    {
      d: "M11.378 13.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-plus.js
var FolderPlus = [
  ["path", { d: "M12 10v6" }],
  ["path", { d: "M9 13h6" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folder-root.js
var FolderRoot = [
  [
    "path",
    {
      d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "2" }],
  ["path", { d: "M12 15v5" }]
];

// node_modules/lucide/dist/esm/icons/folder-search-2.js
var FolderSearch2 = [
  ["circle", { cx: "11.5", cy: "12.5", r: "2.5" }],
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "M13.3 14.3 15 16" }]
];

// node_modules/lucide/dist/esm/icons/folder-search.js
var FolderSearch = [
  [
    "path",
    {
      d: "M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"
    }
  ],
  ["path", { d: "m21 21-1.9-1.9" }],
  ["circle", { cx: "17", cy: "17", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/folder-symlink.js
var FolderSymlink = [
  [
    "path",
    {
      d: "M2 9.35V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"
    }
  ],
  ["path", { d: "m8 16 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/folder-sync.js
var FolderSync = [
  [
    "path",
    {
      d: "M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"
    }
  ],
  ["path", { d: "M12 10v4h4" }],
  ["path", { d: "m12 14 1.535-1.605a5 5 0 0 1 8 1.5" }],
  ["path", { d: "M22 22v-4h-4" }],
  ["path", { d: "m22 18-1.535 1.605a5 5 0 0 1-8-1.5" }]
];

// node_modules/lucide/dist/esm/icons/folder-tree.js
var FolderTree = [
  [
    "path",
    {
      d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"
    }
  ],
  [
    "path",
    {
      d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"
    }
  ],
  ["path", { d: "M3 5a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M3 3v13a2 2 0 0 0 2 2h3" }]
];

// node_modules/lucide/dist/esm/icons/folder-up.js
var FolderUp = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "M12 10v6" }],
  ["path", { d: "m9 13 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/folder-x.js
var FolderX = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ],
  ["path", { d: "m9.5 10.5 5 5" }],
  ["path", { d: "m14.5 10.5-5 5" }]
];

// node_modules/lucide/dist/esm/icons/folder.js
var Folder = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/folders.js
var Folders = [
  [
    "path",
    {
      d: "M20 5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2.5a1.5 1.5 0 0 1 1.2.6l.6.8a1.5 1.5 0 0 0 1.2.6z"
    }
  ],
  ["path", { d: "M3 8.268a2 2 0 0 0-1 1.738V19a2 2 0 0 0 2 2h11a2 2 0 0 0 1.732-1" }]
];

// node_modules/lucide/dist/esm/icons/footprints.js
var Footprints = [
  [
    "path",
    {
      d: "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"
    }
  ],
  [
    "path",
    {
      d: "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"
    }
  ],
  ["path", { d: "M16 17h4" }],
  ["path", { d: "M4 13h4" }]
];

// node_modules/lucide/dist/esm/icons/forklift.js
var Forklift = [
  ["path", { d: "M12 12H5a2 2 0 0 0-2 2v5" }],
  ["circle", { cx: "13", cy: "19", r: "2" }],
  ["circle", { cx: "5", cy: "19", r: "2" }],
  ["path", { d: "M8 19h3m5-17v17h6M6 12V7c0-1.1.9-2 2-2h3l5 5" }]
];

// node_modules/lucide/dist/esm/icons/forward.js
var Forward = [
  ["path", { d: "m15 17 5-5-5-5" }],
  ["path", { d: "M4 18v-2a4 4 0 0 1 4-4h12" }]
];

// node_modules/lucide/dist/esm/icons/frame.js
var Frame = [
  ["line", { x1: "22", x2: "2", y1: "6", y2: "6" }],
  ["line", { x1: "22", x2: "2", y1: "18", y2: "18" }],
  ["line", { x1: "6", x2: "6", y1: "2", y2: "22" }],
  ["line", { x1: "18", x2: "18", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/framer.js
var Framer = [["path", { d: "M5 16V9h14V2H5l14 14h-7m-7 0 7 7v-7m-7 0h7" }]];

// node_modules/lucide/dist/esm/icons/frown.js
var Frown = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M16 16s-1.5-2-4-2-4 2-4 2" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/fuel.js
var Fuel = [
  ["path", { d: "M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" }],
  ["path", { d: "M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" }],
  ["path", { d: "M2 21h13" }],
  ["path", { d: "M3 9h11" }]
];

// node_modules/lucide/dist/esm/icons/fullscreen.js
var Fullscreen = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["rect", { width: "10", height: "8", x: "7", y: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/funnel-plus.js
var FunnelPlus = [
  [
    "path",
    {
      d: "M13.354 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l1.218-1.348"
    }
  ],
  ["path", { d: "M16 6h6" }],
  ["path", { d: "M19 3v6" }]
];

// node_modules/lucide/dist/esm/icons/funnel-x.js
var FunnelX = [
  [
    "path",
    {
      d: "M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473"
    }
  ],
  ["path", { d: "m16.5 3.5 5 5" }],
  ["path", { d: "m21.5 3.5-5 5" }]
];

// node_modules/lucide/dist/esm/icons/funnel.js
var Funnel = [
  [
    "path",
    {
      d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/gallery-horizontal-end.js
var GalleryHorizontalEnd = [
  ["path", { d: "M2 7v10" }],
  ["path", { d: "M6 5v14" }],
  ["rect", { width: "12", height: "18", x: "10", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/gallery-horizontal.js
var GalleryHorizontal = [
  ["path", { d: "M2 3v18" }],
  ["rect", { width: "12", height: "18", x: "6", y: "3", rx: "2" }],
  ["path", { d: "M22 3v18" }]
];

// node_modules/lucide/dist/esm/icons/gallery-thumbnails.js
var GalleryThumbnails = [
  ["rect", { width: "18", height: "14", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M4 21h1" }],
  ["path", { d: "M9 21h1" }],
  ["path", { d: "M14 21h1" }],
  ["path", { d: "M19 21h1" }]
];

// node_modules/lucide/dist/esm/icons/gallery-vertical-end.js
var GalleryVerticalEnd = [
  ["path", { d: "M7 2h10" }],
  ["path", { d: "M5 6h14" }],
  ["rect", { width: "18", height: "12", x: "3", y: "10", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/gallery-vertical.js
var GalleryVertical = [
  ["path", { d: "M3 2h18" }],
  ["rect", { width: "18", height: "12", x: "3", y: "6", rx: "2" }],
  ["path", { d: "M3 22h18" }]
];

// node_modules/lucide/dist/esm/icons/gamepad-2.js
var Gamepad2 = [
  ["line", { x1: "6", x2: "10", y1: "11", y2: "11" }],
  ["line", { x1: "8", x2: "8", y1: "9", y2: "13" }],
  ["line", { x1: "15", x2: "15.01", y1: "12", y2: "12" }],
  ["line", { x1: "18", x2: "18.01", y1: "10", y2: "10" }],
  [
    "path",
    {
      d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/gamepad-directional.js
var GamepadDirectional = [
  [
    "path",
    {
      d: "M11.146 15.854a1.207 1.207 0 0 1 1.708 0l1.56 1.56A2 2 0 0 1 15 18.828V21a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2.172a2 2 0 0 1 .586-1.414z"
    }
  ],
  [
    "path",
    {
      d: "M18.828 15a2 2 0 0 1-1.414-.586l-1.56-1.56a1.207 1.207 0 0 1 0-1.708l1.56-1.56A2 2 0 0 1 18.828 9H21a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1z"
    }
  ],
  [
    "path",
    {
      d: "M6.586 14.414A2 2 0 0 1 5.172 15H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2.172a2 2 0 0 1 1.414.586l1.56 1.56a1.207 1.207 0 0 1 0 1.708z"
    }
  ],
  [
    "path",
    {
      d: "M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.172a2 2 0 0 1-.586 1.414l-1.56 1.56a1.207 1.207 0 0 1-1.708 0l-1.56-1.56A2 2 0 0 1 9 5.172z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/gamepad.js
var Gamepad = [
  ["line", { x1: "6", x2: "10", y1: "12", y2: "12" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14" }],
  ["line", { x1: "15", x2: "15.01", y1: "13", y2: "13" }],
  ["line", { x1: "18", x2: "18.01", y1: "11", y2: "11" }],
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/gauge.js
var Gauge = [
  ["path", { d: "m12 14 4-4" }],
  ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0" }]
];

// node_modules/lucide/dist/esm/icons/gavel.js
var Gavel = [
  ["path", { d: "m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381" }],
  ["path", { d: "m16 16 6-6" }],
  ["path", { d: "m21.5 10.5-8-8" }],
  ["path", { d: "m8 8 6-6" }],
  ["path", { d: "m8.5 7.5 8 8" }]
];

// node_modules/lucide/dist/esm/icons/gem.js
var Gem = [
  ["path", { d: "M10.5 3 8 9l4 13 4-13-2.5-6" }],
  [
    "path",
    {
      d: "M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"
    }
  ],
  ["path", { d: "M2 9h20" }]
];

// node_modules/lucide/dist/esm/icons/georgian-lari.js
var GeorgianLari = [
  ["path", { d: "M11.5 21a7.5 7.5 0 1 1 7.35-9" }],
  ["path", { d: "M13 12V3" }],
  ["path", { d: "M4 21h16" }],
  ["path", { d: "M9 12V3" }]
];

// node_modules/lucide/dist/esm/icons/ghost.js
var Ghost = [
  ["path", { d: "M9 10h.01" }],
  ["path", { d: "M15 10h.01" }],
  ["path", { d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" }]
];

// node_modules/lucide/dist/esm/icons/gift.js
var Gift = [
  ["rect", { x: "3", y: "8", width: "18", height: "4", rx: "1" }],
  ["path", { d: "M12 8v13" }],
  ["path", { d: "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" }],
  ["path", { d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" }]
];

// node_modules/lucide/dist/esm/icons/git-branch-plus.js
var GitBranchPlus = [
  ["path", { d: "M6 3v12" }],
  ["path", { d: "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" }],
  ["path", { d: "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" }],
  ["path", { d: "M15 6a9 9 0 0 0-9 9" }],
  ["path", { d: "M18 15v6" }],
  ["path", { d: "M21 18h-6" }]
];

// node_modules/lucide/dist/esm/icons/git-branch.js
var GitBranch = [
  ["line", { x1: "6", x2: "6", y1: "3", y2: "15" }],
  ["circle", { cx: "18", cy: "6", r: "3" }],
  ["circle", { cx: "6", cy: "18", r: "3" }],
  ["path", { d: "M18 9a9 9 0 0 1-9 9" }]
];

// node_modules/lucide/dist/esm/icons/git-commit-horizontal.js
var GitCommitHorizontal = [
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["line", { x1: "3", x2: "9", y1: "12", y2: "12" }],
  ["line", { x1: "15", x2: "21", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/git-commit-vertical.js
var GitCommitVertical = [
  ["path", { d: "M12 3v6" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "M12 15v6" }]
];

// node_modules/lucide/dist/esm/icons/git-compare-arrows.js
var GitCompareArrows = [
  ["circle", { cx: "5", cy: "6", r: "3" }],
  ["path", { d: "M12 6h5a2 2 0 0 1 2 2v7" }],
  ["path", { d: "m15 9-3-3 3-3" }],
  ["circle", { cx: "19", cy: "18", r: "3" }],
  ["path", { d: "M12 18H7a2 2 0 0 1-2-2V9" }],
  ["path", { d: "m9 15 3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/git-compare.js
var GitCompare = [
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v7" }],
  ["path", { d: "M11 18H8a2 2 0 0 1-2-2V9" }]
];

// node_modules/lucide/dist/esm/icons/git-fork.js
var GitFork = [
  ["circle", { cx: "12", cy: "18", r: "3" }],
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["circle", { cx: "18", cy: "6", r: "3" }],
  ["path", { d: "M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" }],
  ["path", { d: "M12 12v3" }]
];

// node_modules/lucide/dist/esm/icons/git-graph.js
var GitGraph = [
  ["circle", { cx: "5", cy: "6", r: "3" }],
  ["path", { d: "M5 9v6" }],
  ["circle", { cx: "5", cy: "18", r: "3" }],
  ["path", { d: "M12 3v18" }],
  ["circle", { cx: "19", cy: "6", r: "3" }],
  ["path", { d: "M16 15.7A9 9 0 0 0 19 9" }]
];

// node_modules/lucide/dist/esm/icons/git-merge.js
var GitMerge = [
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M6 21V9a9 9 0 0 0 9 9" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request-arrow.js
var GitPullRequestArrow = [
  ["circle", { cx: "5", cy: "6", r: "3" }],
  ["path", { d: "M5 9v12" }],
  ["circle", { cx: "19", cy: "18", r: "3" }],
  ["path", { d: "m15 9-3-3 3-3" }],
  ["path", { d: "M12 6h5a2 2 0 0 1 2 2v7" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request-create-arrow.js
var GitPullRequestCreateArrow = [
  ["circle", { cx: "5", cy: "6", r: "3" }],
  ["path", { d: "M5 9v12" }],
  ["path", { d: "m15 9-3-3 3-3" }],
  ["path", { d: "M12 6h5a2 2 0 0 1 2 2v3" }],
  ["path", { d: "M19 15v6" }],
  ["path", { d: "M22 18h-6" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request-closed.js
var GitPullRequestClosed = [
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M6 9v12" }],
  ["path", { d: "m21 3-6 6" }],
  ["path", { d: "m21 9-6-6" }],
  ["path", { d: "M18 11.5V15" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request-create.js
var GitPullRequestCreate = [
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M6 9v12" }],
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v3" }],
  ["path", { d: "M18 15v6" }],
  ["path", { d: "M21 18h-6" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request-draft.js
var GitPullRequestDraft = [
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M18 6V5" }],
  ["path", { d: "M18 11v-1" }],
  ["line", { x1: "6", x2: "6", y1: "9", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/git-pull-request.js
var GitPullRequest = [
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v7" }],
  ["line", { x1: "6", x2: "6", y1: "9", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/github.js
var Github = [
  [
    "path",
    {
      d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
    }
  ],
  ["path", { d: "M9 18c-4.51 2-5-2-7-2" }]
];

// node_modules/lucide/dist/esm/icons/gitlab.js
var Gitlab = [
  [
    "path",
    {
      d: "m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.1 3.26a.42.42 0 0 0-.1-.18.38.38 0 0 0-.26-.08.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/glass-water.js
var GlassWater = [
  [
    "path",
    {
      d: "M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z"
    }
  ],
  ["path", { d: "M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" }]
];

// node_modules/lucide/dist/esm/icons/glasses.js
var Glasses = [
  ["circle", { cx: "6", cy: "15", r: "4" }],
  ["circle", { cx: "18", cy: "15", r: "4" }],
  ["path", { d: "M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }],
  ["path", { d: "M2.5 13 5 7c.7-1.3 1.4-2 3-2" }],
  ["path", { d: "M21.5 13 19 7c-.7-1.3-1.5-2-3-2" }]
];

// node_modules/lucide/dist/esm/icons/globe-lock.js
var GlobeLock = [
  ["path", { d: "M15.686 15A14.5 14.5 0 0 1 12 22a14.5 14.5 0 0 1 0-20 10 10 0 1 0 9.542 13" }],
  ["path", { d: "M2 12h8.5" }],
  ["path", { d: "M20 6V4a2 2 0 1 0-4 0v2" }],
  ["rect", { width: "8", height: "5", x: "14", y: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/globe.js
var Globe = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }],
  ["path", { d: "M2 12h20" }]
];

// node_modules/lucide/dist/esm/icons/goal.js
var Goal = [
  ["path", { d: "M12 13V2l8 4-8 4" }],
  ["path", { d: "M20.561 10.222a9 9 0 1 1-12.55-5.29" }],
  ["path", { d: "M8.002 9.997a5 5 0 1 0 8.9 2.02" }]
];

// node_modules/lucide/dist/esm/icons/gpu.js
var Gpu = [
  ["path", { d: "M2 21V3" }],
  ["path", { d: "M2 5h18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2.26" }],
  ["path", { d: "M7 17v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3" }],
  ["circle", { cx: "16", cy: "11", r: "2" }],
  ["circle", { cx: "8", cy: "11", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/graduation-cap.js
var GraduationCap = [
  [
    "path",
    {
      d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"
    }
  ],
  ["path", { d: "M22 10v6" }],
  ["path", { d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }]
];

// node_modules/lucide/dist/esm/icons/grape.js
var Grape = [
  ["path", { d: "M22 5V2l-5.89 5.89" }],
  ["circle", { cx: "16.6", cy: "15.89", r: "3" }],
  ["circle", { cx: "8.11", cy: "7.4", r: "3" }],
  ["circle", { cx: "12.35", cy: "11.65", r: "3" }],
  ["circle", { cx: "13.91", cy: "5.85", r: "3" }],
  ["circle", { cx: "18.15", cy: "10.09", r: "3" }],
  ["circle", { cx: "6.56", cy: "13.2", r: "3" }],
  ["circle", { cx: "10.8", cy: "17.44", r: "3" }],
  ["circle", { cx: "5", cy: "19", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/grid-2x2-check.js
var Grid2x2Check = [
  [
    "path",
    {
      d: "M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"
    }
  ],
  ["path", { d: "m16 19 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/grid-2x2-plus.js
var Grid2x2Plus = [
  [
    "path",
    {
      d: "M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"
    }
  ],
  ["path", { d: "M16 19h6" }],
  ["path", { d: "M19 22v-6" }]
];

// node_modules/lucide/dist/esm/icons/grid-2x2-x.js
var Grid2x2X = [
  [
    "path",
    {
      d: "M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"
    }
  ],
  ["path", { d: "m16 16 5 5" }],
  ["path", { d: "m16 21 5-5" }]
];

// node_modules/lucide/dist/esm/icons/grid-2x2.js
var Grid2x2 = [
  ["path", { d: "M12 3v18" }],
  ["path", { d: "M3 12h18" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/grid-3x2.js
var Grid3x2 = [
  ["path", { d: "M15 3v18" }],
  ["path", { d: "M3 12h18" }],
  ["path", { d: "M9 3v18" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/grid-3x3.js
var Grid3x3 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "M9 3v18" }],
  ["path", { d: "M15 3v18" }]
];

// node_modules/lucide/dist/esm/icons/grip-horizontal.js
var GripHorizontal = [
  ["circle", { cx: "12", cy: "9", r: "1" }],
  ["circle", { cx: "19", cy: "9", r: "1" }],
  ["circle", { cx: "5", cy: "9", r: "1" }],
  ["circle", { cx: "12", cy: "15", r: "1" }],
  ["circle", { cx: "19", cy: "15", r: "1" }],
  ["circle", { cx: "5", cy: "15", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/grip-vertical.js
var GripVertical = [
  ["circle", { cx: "9", cy: "12", r: "1" }],
  ["circle", { cx: "9", cy: "5", r: "1" }],
  ["circle", { cx: "9", cy: "19", r: "1" }],
  ["circle", { cx: "15", cy: "12", r: "1" }],
  ["circle", { cx: "15", cy: "5", r: "1" }],
  ["circle", { cx: "15", cy: "19", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/grip.js
var Grip = [
  ["circle", { cx: "12", cy: "5", r: "1" }],
  ["circle", { cx: "19", cy: "5", r: "1" }],
  ["circle", { cx: "5", cy: "5", r: "1" }],
  ["circle", { cx: "12", cy: "12", r: "1" }],
  ["circle", { cx: "19", cy: "12", r: "1" }],
  ["circle", { cx: "5", cy: "12", r: "1" }],
  ["circle", { cx: "12", cy: "19", r: "1" }],
  ["circle", { cx: "19", cy: "19", r: "1" }],
  ["circle", { cx: "5", cy: "19", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/group.js
var Group = [
  ["path", { d: "M3 7V5c0-1.1.9-2 2-2h2" }],
  ["path", { d: "M17 3h2c1.1 0 2 .9 2 2v2" }],
  ["path", { d: "M21 17v2c0 1.1-.9 2-2 2h-2" }],
  ["path", { d: "M7 21H5c-1.1 0-2-.9-2-2v-2" }],
  ["rect", { width: "7", height: "5", x: "7", y: "7", rx: "1" }],
  ["rect", { width: "7", height: "5", x: "10", y: "12", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/guitar.js
var Guitar = [
  ["path", { d: "m11.9 12.1 4.514-4.514" }],
  [
    "path",
    {
      d: "M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z"
    }
  ],
  ["path", { d: "m6 16 2 2" }],
  [
    "path",
    {
      d: "M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/ham.js
var Ham = [
  ["path", { d: "M13.144 21.144A7.274 10.445 45 1 0 2.856 10.856" }],
  [
    "path",
    { d: "M13.144 21.144A7.274 4.365 45 0 0 2.856 10.856a7.274 4.365 45 0 0 10.288 10.288" }
  ],
  [
    "path",
    {
      d: "M16.565 10.435 18.6 8.4a2.501 2.501 0 1 0 1.65-4.65 2.5 2.5 0 1 0-4.66 1.66l-2.024 2.025"
    }
  ],
  ["path", { d: "m8.5 16.5-1-1" }]
];

// node_modules/lucide/dist/esm/icons/hamburger.js
var Hamburger = [
  ["path", { d: "M12 16H4a2 2 0 1 1 0-4h16a2 2 0 1 1 0 4h-4.25" }],
  ["path", { d: "M5 12a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2" }],
  ["path", { d: "M5 16a2 2 0 0 0-2 2 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 2 2 0 0 0-2-2q0 0 0 0" }],
  ["path", { d: "m6.67 12 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" }]
];

// node_modules/lucide/dist/esm/icons/hammer.js
var Hammer = [
  ["path", { d: "m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" }],
  ["path", { d: "m18 15 4-4" }],
  [
    "path",
    {
      d: "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/hand-coins.js
var HandCoins = [
  ["path", { d: "M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" }],
  [
    "path",
    {
      d: "m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"
    }
  ],
  ["path", { d: "m2 16 6 6" }],
  ["circle", { cx: "16", cy: "9", r: "2.9" }],
  ["circle", { cx: "6", cy: "5", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/hand-fist.js
var HandFist = [
  [
    "path",
    {
      d: "M12.035 17.012a3 3 0 0 0-3-3l-.311-.002a.72.72 0 0 1-.505-1.229l1.195-1.195A2 2 0 0 1 10.828 11H12a2 2 0 0 0 0-4H9.243a3 3 0 0 0-2.122.879l-2.707 2.707A4.83 4.83 0 0 0 3 14a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0"
    }
  ],
  ["path", { d: "M13.888 9.662A2 2 0 0 0 17 8V5A2 2 0 1 0 13 5" }],
  ["path", { d: "M9 5A2 2 0 1 0 5 5V10" }],
  ["path", { d: "M9 7V4A2 2 0 1 1 13 4V7.268" }]
];

// node_modules/lucide/dist/esm/icons/hand-heart.js
var HandHeart = [
  ["path", { d: "M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" }],
  [
    "path",
    {
      d: "m14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95"
    }
  ],
  ["path", { d: "m2 15 6 6" }],
  [
    "path",
    { d: "m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91" }
  ]
];

// node_modules/lucide/dist/esm/icons/hand-grab.js
var HandGrab = [
  ["path", { d: "M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4" }],
  ["path", { d: "M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }],
  ["path", { d: "M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5" }],
  ["path", { d: "M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }],
  ["path", { d: "M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0" }]
];

// node_modules/lucide/dist/esm/icons/hand-helping.js
var HandHelping = [
  ["path", { d: "M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14" }],
  [
    "path",
    {
      d: "m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"
    }
  ],
  ["path", { d: "m2 13 6 6" }]
];

// node_modules/lucide/dist/esm/icons/hand-metal.js
var HandMetal = [
  ["path", { d: "M18 12.5V10a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4" }],
  ["path", { d: "M14 11V9a2 2 0 1 0-4 0v2" }],
  ["path", { d: "M10 10.5V5a2 2 0 1 0-4 0v9" }],
  [
    "path",
    {
      d: "m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/hand-platter.js
var HandPlatter = [
  ["path", { d: "M12 3V2" }],
  [
    "path",
    {
      d: "m15.4 17.4 3.2-2.8a2 2 0 1 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2l-1.302-1.464A1 1 0 0 0 6.151 19H5"
    }
  ],
  ["path", { d: "M2 14h12a2 2 0 0 1 0 4h-2" }],
  ["path", { d: "M4 10h16" }],
  ["path", { d: "M5 10a7 7 0 0 1 14 0" }],
  ["path", { d: "M5 14v6a1 1 0 0 1-1 1H2" }]
];

// node_modules/lucide/dist/esm/icons/hand.js
var Hand = [
  ["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }],
  ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }],
  ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }],
  [
    "path",
    {
      d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/handbag.js
var Handbag = [
  [
    "path",
    {
      d: "M2.048 18.566A2 2 0 0 0 4 21h16a2 2 0 0 0 1.952-2.434l-2-9A2 2 0 0 0 18 8H6a2 2 0 0 0-1.952 1.566z"
    }
  ],
  ["path", { d: "M8 11V6a4 4 0 0 1 8 0v5" }]
];

// node_modules/lucide/dist/esm/icons/handshake.js
var Handshake = [
  ["path", { d: "m11 17 2 2a1 1 0 1 0 3-3" }],
  [
    "path",
    {
      d: "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
    }
  ],
  ["path", { d: "m21 3 1 11h-2" }],
  ["path", { d: "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" }],
  ["path", { d: "M3 4h8" }]
];

// node_modules/lucide/dist/esm/icons/hard-drive-download.js
var HardDriveDownload = [
  ["path", { d: "M12 2v8" }],
  ["path", { d: "m16 6-4 4-4-4" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "M10 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/hard-drive-upload.js
var HardDriveUpload = [
  ["path", { d: "m16 6-4-4-4 4" }],
  ["path", { d: "M12 2v8" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "M10 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/hard-drive.js
var HardDrive = [
  ["line", { x1: "22", x2: "2", y1: "12", y2: "12" }],
  [
    "path",
    {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
    }
  ],
  ["line", { x1: "6", x2: "6.01", y1: "16", y2: "16" }],
  ["line", { x1: "10", x2: "10.01", y1: "16", y2: "16" }]
];

// node_modules/lucide/dist/esm/icons/hard-hat.js
var HardHat = [
  ["path", { d: "M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" }],
  ["path", { d: "M14 6a6 6 0 0 1 6 6v3" }],
  ["path", { d: "M4 15v-3a6 6 0 0 1 6-6" }],
  ["rect", { x: "2", y: "15", width: "20", height: "4", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/hash.js
var Hash = [
  ["line", { x1: "4", x2: "20", y1: "9", y2: "9" }],
  ["line", { x1: "4", x2: "20", y1: "15", y2: "15" }],
  ["line", { x1: "10", x2: "8", y1: "3", y2: "21" }],
  ["line", { x1: "16", x2: "14", y1: "3", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/hat-glasses.js
var HatGlasses = [
  ["path", { d: "M14 18a2 2 0 0 0-4 0" }],
  [
    "path",
    {
      d: "m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11"
    }
  ],
  ["path", { d: "M2 11h20" }],
  ["circle", { cx: "17", cy: "18", r: "3" }],
  ["circle", { cx: "7", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/haze.js
var Haze = [
  ["path", { d: "m5.2 6.2 1.4 1.4" }],
  ["path", { d: "M2 13h2" }],
  ["path", { d: "M20 13h2" }],
  ["path", { d: "m17.4 7.6 1.4-1.4" }],
  ["path", { d: "M22 17H2" }],
  ["path", { d: "M22 21H2" }],
  ["path", { d: "M16 13a4 4 0 0 0-8 0" }],
  ["path", { d: "M12 5V2.5" }]
];

// node_modules/lucide/dist/esm/icons/hdmi-port.js
var HdmiPort = [
  [
    "path",
    { d: "M22 9a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1l2 2h12l2-2h1a1 1 0 0 0 1-1Z" }
  ],
  ["path", { d: "M7.5 12h9" }]
];

// node_modules/lucide/dist/esm/icons/heading-1.js
var Heading1 = [
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }],
  ["path", { d: "M12 18V6" }],
  ["path", { d: "m17 12 3-2v8" }]
];

// node_modules/lucide/dist/esm/icons/heading-2.js
var Heading2 = [
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }],
  ["path", { d: "M12 18V6" }],
  ["path", { d: "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" }]
];

// node_modules/lucide/dist/esm/icons/heading-3.js
var Heading3 = [
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }],
  ["path", { d: "M12 18V6" }],
  ["path", { d: "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" }],
  ["path", { d: "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" }]
];

// node_modules/lucide/dist/esm/icons/heading-4.js
var Heading4 = [
  ["path", { d: "M12 18V6" }],
  ["path", { d: "M17 10v3a1 1 0 0 0 1 1h3" }],
  ["path", { d: "M21 10v8" }],
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }]
];

// node_modules/lucide/dist/esm/icons/heading-5.js
var Heading5 = [
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }],
  ["path", { d: "M12 18V6" }],
  ["path", { d: "M17 13v-3h4" }],
  ["path", { d: "M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17" }]
];

// node_modules/lucide/dist/esm/icons/heading-6.js
var Heading6 = [
  ["path", { d: "M4 12h8" }],
  ["path", { d: "M4 18V6" }],
  ["path", { d: "M12 18V6" }],
  ["circle", { cx: "19", cy: "16", r: "2" }],
  ["path", { d: "M20 10c-2 2-3 3.5-3 6" }]
];

// node_modules/lucide/dist/esm/icons/heading.js
var Heading = [
  ["path", { d: "M6 12h12" }],
  ["path", { d: "M6 20V4" }],
  ["path", { d: "M18 20V4" }]
];

// node_modules/lucide/dist/esm/icons/headphone-off.js
var HeadphoneOff = [
  ["path", { d: "M21 14h-1.343" }],
  ["path", { d: "M9.128 3.47A9 9 0 0 1 21 12v3.343" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20.414 20.414A2 2 0 0 1 19 21h-1a2 2 0 0 1-2-2v-3" }],
  ["path", { d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 2.636-6.364" }]
];

// node_modules/lucide/dist/esm/icons/headphones.js
var Headphones = [
  [
    "path",
    {
      d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/headset.js
var Headset = [
  [
    "path",
    {
      d: "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"
    }
  ],
  ["path", { d: "M21 16v2a4 4 0 0 1-4 4h-5" }]
];

// node_modules/lucide/dist/esm/icons/heart-crack.js
var HeartCrack = [
  [
    "path",
    {
      d: "M12.409 5.824c-.702.792-1.15 1.496-1.415 2.166l2.153 2.156a.5.5 0 0 1 0 .707l-2.293 2.293a.5.5 0 0 0 0 .707L12 15"
    }
  ],
  [
    "path",
    {
      d: "M13.508 20.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.677.6.6 0 0 0 .818.001A5.5 5.5 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/heart-handshake.js
var HeartHandshake = [
  [
    "path",
    {
      d: "M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/heart-minus.js
var HeartMinus = [
  [
    "path",
    {
      d: "m14.876 18.99-1.368 1.323a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5a5.2 5.2 0 0 1-.244 1.572"
    }
  ],
  ["path", { d: "M15 15h6" }]
];

// node_modules/lucide/dist/esm/icons/heart-off.js
var HeartOff = [
  [
    "path",
    {
      d: "M10.5 4.893a5.5 5.5 0 0 1 1.091.931.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 1.872-1.002 3.356-2.187 4.655"
    }
  ],
  [
    "path",
    {
      d: "m16.967 16.967-3.459 3.346a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 2.747-4.761"
    }
  ],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/heart-plus.js
var HeartPlus = [
  [
    "path",
    {
      d: "m14.479 19.374-.971.939a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5a5.2 5.2 0 0 1-.219 1.49"
    }
  ],
  ["path", { d: "M15 15h6" }],
  ["path", { d: "M18 12v6" }]
];

// node_modules/lucide/dist/esm/icons/heart-pulse.js
var HeartPulse = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
    }
  ],
  ["path", { d: "M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" }]
];

// node_modules/lucide/dist/esm/icons/heart.js
var Heart = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/heater.js
var Heater = [
  ["path", { d: "M11 8c2-3-2-3 0-6" }],
  ["path", { d: "M15.5 8c2-3-2-3 0-6" }],
  ["path", { d: "M6 10h.01" }],
  ["path", { d: "M6 14h.01" }],
  ["path", { d: "M10 16v-4" }],
  ["path", { d: "M14 16v-4" }],
  ["path", { d: "M18 16v-4" }],
  ["path", { d: "M20 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" }],
  ["path", { d: "M5 20v2" }],
  ["path", { d: "M19 20v2" }]
];

// node_modules/lucide/dist/esm/icons/highlighter.js
var Highlighter = [
  ["path", { d: "m9 11-6 6v3h9l3-3" }],
  ["path", { d: "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" }]
];

// node_modules/lucide/dist/esm/icons/hexagon.js
var Hexagon = [
  [
    "path",
    {
      d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/history.js
var History = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }],
  ["path", { d: "M12 7v5l4 2" }]
];

// node_modules/lucide/dist/esm/icons/hop-off.js
var HopOff = [
  ["path", { d: "M10.82 16.12c1.69.6 3.91.79 5.18.85.28.01.53-.09.7-.27" }],
  [
    "path",
    { d: "M11.14 20.57c.52.24 2.44 1.12 4.08 1.37.46.06.86-.25.9-.71.12-1.52-.3-3.43-.5-4.28" }
  ],
  ["path", { d: "M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .7-.26" }],
  [
    "path",
    { d: "M17.99 5.52a20.83 20.83 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-1.17.1-2.5.02-3.9-.25" }
  ],
  ["path", { d: "M20.57 11.14c.24.52 1.12 2.44 1.37 4.08.04.3-.08.59-.31.75" }],
  [
    "path",
    {
      d: "M4.93 4.93a10 10 0 0 0-.67 13.4c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.85.85 0 0 0 .48-.24"
    }
  ],
  [
    "path",
    { d: "M5.52 17.99c1.05.95 2.91 2.42 4.5 3.15a.8.8 0 0 0 1.13-.68c.2-2.34-.33-5.3-1.57-8.28" }
  ],
  ["path", { d: "M8.35 2.68a10 10 0 0 1 9.98 1.58c.43.35.4.96-.12 1.17-1.5.6-4.3.98-6.07 1.05" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/hop.js
var Hop = [
  [
    "path",
    { d: "M10.82 16.12c1.69.6 3.91.79 5.18.85.55.03 1-.42.97-.97-.06-1.27-.26-3.5-.85-5.18" }
  ],
  [
    "path",
    {
      d: "M11.5 6.5c1.64 0 5-.38 6.71-1.07.52-.2.55-.82.12-1.17A10 10 0 0 0 4.26 18.33c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.88.88 0 0 0 .73-.74c.3-2.14-.15-3.5-.61-4.88"
    }
  ],
  [
    "path",
    { d: "M15.62 16.95c.2.85.62 2.76.5 4.28a.77.77 0 0 1-.9.7 16.64 16.64 0 0 1-4.08-1.36" }
  ],
  [
    "path",
    { d: "M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .96-.96 17.68 17.68 0 0 0-.9-4.87" }
  ],
  [
    "path",
    { d: "M16.94 15.62c.86.2 2.77.62 4.29.5a.77.77 0 0 0 .7-.9 16.64 16.64 0 0 0-1.36-4.08" }
  ],
  [
    "path",
    { d: "M17.99 5.52a20.82 20.82 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-2.33.2-5.3-.32-8.27-1.57" }
  ],
  ["path", { d: "M4.93 4.93 3 3a.7.7 0 0 1 0-1" }],
  [
    "path",
    {
      d: "M9.58 12.18c1.24 2.98 1.77 5.95 1.57 8.28a.8.8 0 0 1-1.13.68 20.82 20.82 0 0 1-4.5-3.15"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/hospital.js
var Hospital = [
  ["path", { d: "M12 7v4" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
  ["path", { d: "M14 9h-4" }],
  ["path", { d: "M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16" }]
];

// node_modules/lucide/dist/esm/icons/hotel.js
var Hotel = [
  ["path", { d: "M10 22v-6.57" }],
  ["path", { d: "M12 11h.01" }],
  ["path", { d: "M12 7h.01" }],
  ["path", { d: "M14 15.43V22" }],
  ["path", { d: "M15 16a5 5 0 0 0-6 0" }],
  ["path", { d: "M16 11h.01" }],
  ["path", { d: "M16 7h.01" }],
  ["path", { d: "M8 11h.01" }],
  ["path", { d: "M8 7h.01" }],
  ["rect", { x: "4", y: "2", width: "16", height: "20", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/hourglass.js
var Hourglass = [
  ["path", { d: "M5 22h14" }],
  ["path", { d: "M5 2h14" }],
  ["path", { d: "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" }],
  ["path", { d: "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" }]
];

// node_modules/lucide/dist/esm/icons/house-plug.js
var HousePlug = [
  ["path", { d: "M10 12V8.964" }],
  ["path", { d: "M14 12V8.964" }],
  ["path", { d: "M15 12a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2a1 1 0 0 1 1-1z" }],
  [
    "path",
    {
      d: "M8.5 21H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/house-heart.js
var HouseHeart = [
  [
    "path",
    {
      d: "M8.62 13.8A2.25 2.25 0 1 1 12 10.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
    }
  ],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/house-wifi.js
var HouseWifi = [
  ["path", { d: "M9.5 13.866a4 4 0 0 1 5 .01" }],
  ["path", { d: "M12 17h.01" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    }
  ],
  ["path", { d: "M7 10.754a8 8 0 0 1 10 0" }]
];

// node_modules/lucide/dist/esm/icons/house-plus.js
var HousePlus = [
  [
    "path",
    {
      d: "M12.35 21H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v2.35"
    }
  ],
  ["path", { d: "M14.8 12.4A1 1 0 0 0 14 12h-4a1 1 0 0 0-1 1v8" }],
  ["path", { d: "M15 18h6" }],
  ["path", { d: "M18 15v6" }]
];

// node_modules/lucide/dist/esm/icons/house.js
var House = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/ice-cream-bowl.js
var IceCreamBowl = [
  [
    "path",
    { d: "M12 17c5 0 8-2.69 8-6H4c0 3.31 3 6 8 6m-4 4h8m-4-3v3M5.14 11a3.5 3.5 0 1 1 6.71 0" }
  ],
  ["path", { d: "M12.14 11a3.5 3.5 0 1 1 6.71 0" }],
  ["path", { d: "M15.5 6.5a3.5 3.5 0 1 0-7 0" }]
];

// node_modules/lucide/dist/esm/icons/ice-cream-cone.js
var IceCreamCone = [
  ["path", { d: "m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11" }],
  ["path", { d: "M17 7A5 5 0 0 0 7 7" }],
  ["path", { d: "M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4" }]
];

// node_modules/lucide/dist/esm/icons/id-card.js
var IdCard = [
  ["path", { d: "M16 10h2" }],
  ["path", { d: "M16 14h2" }],
  ["path", { d: "M6.17 15a3 3 0 0 1 5.66 0" }],
  ["circle", { cx: "9", cy: "11", r: "2" }],
  ["rect", { x: "2", y: "5", width: "20", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/id-card-lanyard.js
var IdCardLanyard = [
  ["path", { d: "M13.5 8h-3" }],
  ["path", { d: "m15 2-1 2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" }],
  ["path", { d: "M16.899 22A5 5 0 0 0 7.1 22" }],
  ["path", { d: "m9 2 3 6" }],
  ["circle", { cx: "12", cy: "15", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/image-down.js
var ImageDown = [
  [
    "path",
    {
      d: "M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"
    }
  ],
  ["path", { d: "m14 19 3 3v-5.5" }],
  ["path", { d: "m17 22 3-3" }],
  ["circle", { cx: "9", cy: "9", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/image-minus.js
var ImageMinus = [
  ["path", { d: "M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" }],
  ["line", { x1: "16", x2: "22", y1: "5", y2: "5" }],
  ["circle", { cx: "9", cy: "9", r: "2" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
];

// node_modules/lucide/dist/esm/icons/image-off.js
var ImageOff = [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }],
  ["path", { d: "M10.41 10.41a2 2 0 1 1-2.83-2.83" }],
  ["line", { x1: "13.5", x2: "6", y1: "13.5", y2: "21" }],
  ["line", { x1: "18", x2: "21", y1: "12", y2: "15" }],
  ["path", { d: "M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59" }],
  ["path", { d: "M21 15V5a2 2 0 0 0-2-2H9" }]
];

// node_modules/lucide/dist/esm/icons/image-play.js
var ImagePlay = [
  [
    "path",
    {
      d: "M15 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"
    }
  ],
  ["path", { d: "M21 12.17V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" }],
  ["path", { d: "m6 21 5-5" }],
  ["circle", { cx: "9", cy: "9", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/image-plus.js
var ImagePlus = [
  ["path", { d: "M16 5h6" }],
  ["path", { d: "M19 2v6" }],
  ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }],
  ["circle", { cx: "9", cy: "9", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/image-up.js
var ImageUp = [
  [
    "path",
    {
      d: "M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"
    }
  ],
  ["path", { d: "m14 19.5 3-3 3 3" }],
  ["path", { d: "M17 22v-5.5" }],
  ["circle", { cx: "9", cy: "9", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/image-upscale.js
var ImageUpscale = [
  ["path", { d: "M16 3h5v5" }],
  ["path", { d: "M17 21h2a2 2 0 0 0 2-2" }],
  ["path", { d: "M21 12v3" }],
  ["path", { d: "m21 3-5 5" }],
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2" }],
  ["path", { d: "m5 21 4.144-4.144a1.21 1.21 0 0 1 1.712 0L13 19" }],
  ["path", { d: "M9 3h3" }],
  ["rect", { x: "3", y: "11", width: "10", height: "10", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/image.js
var Image = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["circle", { cx: "9", cy: "9", r: "2" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
];

// node_modules/lucide/dist/esm/icons/images.js
var Images = [
  ["path", { d: "m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" }],
  ["path", { d: "M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" }],
  ["circle", { cx: "13", cy: "7", r: "1", fill: "currentColor" }],
  ["rect", { x: "8", y: "2", width: "14", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/import.js
var Import = [
  ["path", { d: "M12 3v12" }],
  ["path", { d: "m8 11 4 4 4-4" }],
  ["path", { d: "M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" }]
];

// node_modules/lucide/dist/esm/icons/inbox.js
var Inbox = [
  ["polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12" }],
  [
    "path",
    {
      d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/indian-rupee.js
var IndianRupee = [
  ["path", { d: "M6 3h12" }],
  ["path", { d: "M6 8h12" }],
  ["path", { d: "m6 13 8.5 8" }],
  ["path", { d: "M6 13h3" }],
  ["path", { d: "M9 13c6.667 0 6.667-10 0-10" }]
];

// node_modules/lucide/dist/esm/icons/info.js
var Info = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M12 16v-4" }],
  ["path", { d: "M12 8h.01" }]
];

// node_modules/lucide/dist/esm/icons/infinity.js
var Infinity2 = [
  ["path", { d: "M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" }]
];

// node_modules/lucide/dist/esm/icons/inspection-panel.js
var InspectionPanel = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 7h.01" }],
  ["path", { d: "M17 7h.01" }],
  ["path", { d: "M7 17h.01" }],
  ["path", { d: "M17 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/italic.js
var Italic = [
  ["line", { x1: "19", x2: "10", y1: "4", y2: "4" }],
  ["line", { x1: "14", x2: "5", y1: "20", y2: "20" }],
  ["line", { x1: "15", x2: "9", y1: "4", y2: "20" }]
];

// node_modules/lucide/dist/esm/icons/iteration-ccw.js
var IterationCcw = [
  ["path", { d: "m16 14 4 4-4 4" }],
  ["path", { d: "M20 10a8 8 0 1 0-8 8h8" }]
];

// node_modules/lucide/dist/esm/icons/instagram.js
var Instagram = [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5" }]
];

// node_modules/lucide/dist/esm/icons/iteration-cw.js
var IterationCw = [
  ["path", { d: "M4 10a8 8 0 1 1 8 8H4" }],
  ["path", { d: "m8 22-4-4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/japanese-yen.js
var JapaneseYen = [
  ["path", { d: "M12 9.5V21m0-11.5L6 3m6 6.5L18 3" }],
  ["path", { d: "M6 15h12" }],
  ["path", { d: "M6 11h12" }]
];

// node_modules/lucide/dist/esm/icons/joystick.js
var Joystick = [
  ["path", { d: "M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z" }],
  ["path", { d: "M6 15v-2" }],
  ["path", { d: "M12 15V9" }],
  ["circle", { cx: "12", cy: "6", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/kanban.js
var Kanban = [
  ["path", { d: "M5 3v14" }],
  ["path", { d: "M12 3v8" }],
  ["path", { d: "M19 3v18" }]
];

// node_modules/lucide/dist/esm/icons/kayak.js
var Kayak = [
  ["path", { d: "M18 17a1 1 0 0 0-1 1v1a2 2 0 1 0 2-2z" }],
  [
    "path",
    {
      d: "M20.97 3.61a.45.45 0 0 0-.58-.58C10.2 6.6 6.6 10.2 3.03 20.39a.45.45 0 0 0 .58.58C13.8 17.4 17.4 13.8 20.97 3.61"
    }
  ],
  ["path", { d: "m6.707 6.707 10.586 10.586" }],
  ["path", { d: "M7 5a2 2 0 1 0-2 2h1a1 1 0 0 0 1-1z" }]
];

// node_modules/lucide/dist/esm/icons/key-round.js
var KeyRound = [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor" }]
];

// node_modules/lucide/dist/esm/icons/key-square.js
var KeySquare = [
  [
    "path",
    {
      d: "M12.4 2.7a2.5 2.5 0 0 1 3.4 0l5.5 5.5a2.5 2.5 0 0 1 0 3.4l-3.7 3.7a2.5 2.5 0 0 1-3.4 0L8.7 9.8a2.5 2.5 0 0 1 0-3.4z"
    }
  ],
  ["path", { d: "m14 7 3 3" }],
  [
    "path",
    {
      d: "m9.4 10.6-6.814 6.814A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/key.js
var Key = [
  ["path", { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" }],
  ["path", { d: "m21 2-9.6 9.6" }],
  ["circle", { cx: "7.5", cy: "15.5", r: "5.5" }]
];

// node_modules/lucide/dist/esm/icons/keyboard-music.js
var KeyboardMusic = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M6 8h4" }],
  ["path", { d: "M14 8h.01" }],
  ["path", { d: "M18 8h.01" }],
  ["path", { d: "M2 12h20" }],
  ["path", { d: "M6 12v4" }],
  ["path", { d: "M10 12v4" }],
  ["path", { d: "M14 12v4" }],
  ["path", { d: "M18 12v4" }]
];

// node_modules/lucide/dist/esm/icons/keyboard-off.js
var KeyboardOff = [
  ["path", { d: "M 20 4 A2 2 0 0 1 22 6" }],
  ["path", { d: "M 22 6 L 22 16.41" }],
  ["path", { d: "M 7 16 L 16 16" }],
  ["path", { d: "M 9.69 4 L 20 4" }],
  ["path", { d: "M14 8h.01" }],
  ["path", { d: "M18 8h.01" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" }],
  ["path", { d: "M6 8h.01" }],
  ["path", { d: "M8 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/keyboard.js
var Keyboard = [
  ["path", { d: "M10 8h.01" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M14 8h.01" }],
  ["path", { d: "M16 12h.01" }],
  ["path", { d: "M18 8h.01" }],
  ["path", { d: "M6 8h.01" }],
  ["path", { d: "M7 16h10" }],
  ["path", { d: "M8 12h.01" }],
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/lamp-ceiling.js
var LampCeiling = [
  ["path", { d: "M12 2v5" }],
  ["path", { d: "M14.829 15.998a3 3 0 1 1-5.658 0" }],
  [
    "path",
    {
      d: "M20.92 14.606A1 1 0 0 1 20 16H4a1 1 0 0 1-.92-1.394l3-7A1 1 0 0 1 7 7h10a1 1 0 0 1 .92.606z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/lamp-desk.js
var LampDesk = [
  [
    "path",
    {
      d: "M10.293 2.293a1 1 0 0 1 1.414 0l2.5 2.5 5.994 1.227a1 1 0 0 1 .506 1.687l-7 7a1 1 0 0 1-1.687-.506l-1.227-5.994-2.5-2.5a1 1 0 0 1 0-1.414z"
    }
  ],
  ["path", { d: "m14.207 4.793-3.414 3.414" }],
  ["path", { d: "M3 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" }],
  ["path", { d: "m9.086 6.5-4.793 4.793a1 1 0 0 0-.18 1.17L7 18" }]
];

// node_modules/lucide/dist/esm/icons/lamp-floor.js
var LampFloor = [
  ["path", { d: "M12 10v12" }],
  [
    "path",
    {
      d: "M17.929 7.629A1 1 0 0 1 17 9H7a1 1 0 0 1-.928-1.371l2-5A1 1 0 0 1 9 2h6a1 1 0 0 1 .928.629z"
    }
  ],
  ["path", { d: "M9 22h6" }]
];

// node_modules/lucide/dist/esm/icons/lamp-wall-down.js
var LampWallDown = [
  [
    "path",
    {
      d: "M19.929 18.629A1 1 0 0 1 19 20H9a1 1 0 0 1-.928-1.371l2-5A1 1 0 0 1 11 13h6a1 1 0 0 1 .928.629z"
    }
  ],
  ["path", { d: "M6 3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" }],
  ["path", { d: "M8 6h4a2 2 0 0 1 2 2v5" }]
];

// node_modules/lucide/dist/esm/icons/lamp-wall-up.js
var LampWallUp = [
  [
    "path",
    {
      d: "M19.929 9.629A1 1 0 0 1 19 11H9a1 1 0 0 1-.928-1.371l2-5A1 1 0 0 1 11 4h6a1 1 0 0 1 .928.629z"
    }
  ],
  ["path", { d: "M6 15a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" }],
  ["path", { d: "M8 18h4a2 2 0 0 0 2-2v-5" }]
];

// node_modules/lucide/dist/esm/icons/lamp.js
var Lamp = [
  ["path", { d: "M12 12v6" }],
  [
    "path",
    {
      d: "M4.077 10.615A1 1 0 0 0 5 12h14a1 1 0 0 0 .923-1.385l-3.077-7.384A2 2 0 0 0 15 2H9a2 2 0 0 0-1.846 1.23Z"
    }
  ],
  ["path", { d: "M8 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" }]
];

// node_modules/lucide/dist/esm/icons/land-plot.js
var LandPlot = [
  ["path", { d: "m12 8 6-3-6-3v10" }],
  [
    "path",
    {
      d: "m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"
    }
  ],
  ["path", { d: "m6.49 12.85 11.02 6.3" }],
  ["path", { d: "M17.51 12.85 6.5 19.15" }]
];

// node_modules/lucide/dist/esm/icons/landmark.js
var Landmark = [
  ["path", { d: "M10 18v-7" }],
  [
    "path",
    {
      d: "M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"
    }
  ],
  ["path", { d: "M14 18v-7" }],
  ["path", { d: "M18 18v-7" }],
  ["path", { d: "M3 22h18" }],
  ["path", { d: "M6 18v-7" }]
];

// node_modules/lucide/dist/esm/icons/languages.js
var Languages = [
  ["path", { d: "m5 8 6 6" }],
  ["path", { d: "m4 14 6-6 2-3" }],
  ["path", { d: "M2 5h12" }],
  ["path", { d: "M7 2h1" }],
  ["path", { d: "m22 22-5-10-5 10" }],
  ["path", { d: "M14 18h6" }]
];

// node_modules/lucide/dist/esm/icons/laptop-minimal-check.js
var LaptopMinimalCheck = [
  ["path", { d: "M2 20h20" }],
  ["path", { d: "m9 10 2 2 4-4" }],
  ["rect", { x: "3", y: "4", width: "18", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/laptop-minimal.js
var LaptopMinimal = [
  ["rect", { width: "18", height: "12", x: "3", y: "4", rx: "2", ry: "2" }],
  ["line", { x1: "2", x2: "22", y1: "20", y2: "20" }]
];

// node_modules/lucide/dist/esm/icons/laptop.js
var Laptop = [
  [
    "path",
    {
      d: "M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"
    }
  ],
  ["path", { d: "M20.054 15.987H3.946" }]
];

// node_modules/lucide/dist/esm/icons/lasso-select.js
var LassoSelect = [
  ["path", { d: "M7 22a5 5 0 0 1-2-4" }],
  ["path", { d: "M7 16.93c.96.43 1.96.74 2.99.91" }],
  [
    "path",
    { d: "M3.34 14A6.8 6.8 0 0 1 2 10c0-4.42 4.48-8 10-8s10 3.58 10 8a7.19 7.19 0 0 1-.33 2" }
  ],
  ["path", { d: "M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" }],
  [
    "path",
    {
      d: "M14.33 22h-.09a.35.35 0 0 1-.24-.32v-10a.34.34 0 0 1 .33-.34c.08 0 .15.03.21.08l7.34 6a.33.33 0 0 1-.21.59h-4.49l-2.57 3.85a.35.35 0 0 1-.28.14z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/lasso.js
var Lasso = [
  [
    "path",
    { d: "M3.704 14.467A10 8 0 0 1 2 10a10 8 0 0 1 20 0 10 8 0 0 1-10 8 10 8 0 0 1-5.181-1.158" }
  ],
  ["path", { d: "M7 22a5 5 0 0 1-2-3.994" }],
  ["circle", { cx: "5", cy: "16", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/laugh.js
var Laugh = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/layers-2.js
var Layers2 = [
  [
    "path",
    {
      d: "M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z"
    }
  ],
  [
    "path",
    {
      d: "m20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/layers.js
var Layers = [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
    }
  ],
  ["path", { d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" }],
  ["path", { d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" }]
];

// node_modules/lucide/dist/esm/icons/layout-dashboard.js
var LayoutDashboard = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/layout-grid.js
var LayoutGrid = [
  ["rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/layout-list.js
var LayoutList = [
  ["rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" }],
  ["path", { d: "M14 4h7" }],
  ["path", { d: "M14 9h7" }],
  ["path", { d: "M14 15h7" }],
  ["path", { d: "M14 20h7" }]
];

// node_modules/lucide/dist/esm/icons/layout-panel-left.js
var LayoutPanelLeft = [
  ["rect", { width: "7", height: "18", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/layout-panel-top.js
var LayoutPanelTop = [
  ["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/layout-template.js
var LayoutTemplate = [
  ["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "9", height: "7", x: "3", y: "14", rx: "1" }],
  ["rect", { width: "5", height: "7", x: "16", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/leaf.js
var Leaf = [
  [
    "path",
    { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" }
  ],
  ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }]
];

// node_modules/lucide/dist/esm/icons/leafy-green.js
var LeafyGreen = [
  [
    "path",
    {
      d: "M2 22c1.25-.987 2.27-1.975 3.9-2.2a5.56 5.56 0 0 1 3.8 1.5 4 4 0 0 0 6.187-2.353 3.5 3.5 0 0 0 3.69-5.116A3.5 3.5 0 0 0 20.95 8 3.5 3.5 0 1 0 16 3.05a3.5 3.5 0 0 0-5.831 1.373 3.5 3.5 0 0 0-5.116 3.69 4 4 0 0 0-2.348 6.155C3.499 15.42 4.409 16.712 4.2 18.1 3.926 19.743 3.014 20.732 2 22"
    }
  ],
  ["path", { d: "M2 22 17 7" }]
];

// node_modules/lucide/dist/esm/icons/lectern.js
var Lectern = [
  [
    "path",
    {
      d: "M16 12h3a2 2 0 0 0 1.902-1.38l1.056-3.333A1 1 0 0 0 21 6H3a1 1 0 0 0-.958 1.287l1.056 3.334A2 2 0 0 0 5 12h3"
    }
  ],
  ["path", { d: "M18 6V3a1 1 0 0 0-1-1h-3" }],
  ["rect", { width: "8", height: "12", x: "8", y: "10", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/library-big.js
var LibraryBig = [
  ["rect", { width: "8", height: "18", x: "3", y: "3", rx: "1" }],
  ["path", { d: "M7 3v18" }],
  [
    "path",
    {
      d: "M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/life-buoy.js
var LifeBuoy = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m4.93 4.93 4.24 4.24" }],
  ["path", { d: "m14.83 9.17 4.24-4.24" }],
  ["path", { d: "m14.83 14.83 4.24 4.24" }],
  ["path", { d: "m9.17 14.83-4.24 4.24" }],
  ["circle", { cx: "12", cy: "12", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/library.js
var Library = [
  ["path", { d: "m16 6 4 14" }],
  ["path", { d: "M12 6v14" }],
  ["path", { d: "M8 8v12" }],
  ["path", { d: "M4 4v16" }]
];

// node_modules/lucide/dist/esm/icons/ligature.js
var Ligature = [
  ["path", { d: "M14 12h2v8" }],
  ["path", { d: "M14 20h4" }],
  ["path", { d: "M6 12h4" }],
  ["path", { d: "M6 20h4" }],
  ["path", { d: "M8 20V8a4 4 0 0 1 7.464-2" }]
];

// node_modules/lucide/dist/esm/icons/lightbulb-off.js
var LightbulbOff = [
  ["path", { d: "M16.8 11.2c.8-.9 1.2-2 1.2-3.2a6 6 0 0 0-9.3-5" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M6.3 6.3a4.67 4.67 0 0 0 1.2 5.2c.7.7 1.3 1.5 1.5 2.5" }],
  ["path", { d: "M9 18h6" }],
  ["path", { d: "M10 22h4" }]
];

// node_modules/lucide/dist/esm/icons/lightbulb.js
var Lightbulb = [
  [
    "path",
    {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
    }
  ],
  ["path", { d: "M9 18h6" }],
  ["path", { d: "M10 22h4" }]
];

// node_modules/lucide/dist/esm/icons/line-squiggle.js
var LineSquiggle = [
  [
    "path",
    { d: "M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2" }
  ]
];

// node_modules/lucide/dist/esm/icons/link-2-off.js
var Link2Off = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7" }],
  ["path", { d: "M15 7h2a5 5 0 0 1 4 8" }],
  ["line", { x1: "8", x2: "12", y1: "12", y2: "12" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/link-2.js
var Link2 = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2" }],
  ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/link.js
var Link = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }]
];

// node_modules/lucide/dist/esm/icons/linkedin.js
var Linkedin = [
  ["path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" }],
  ["rect", { width: "4", height: "12", x: "2", y: "9" }],
  ["circle", { cx: "4", cy: "4", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/list-check.js
var ListCheck = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M16 12H3" }],
  ["path", { d: "M11 19H3" }],
  ["path", { d: "m15 18 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/list-checks.js
var ListChecks = [
  ["path", { d: "M13 5h8" }],
  ["path", { d: "M13 12h8" }],
  ["path", { d: "M13 19h8" }],
  ["path", { d: "m3 17 2 2 4-4" }],
  ["path", { d: "m3 7 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/list-chevrons-down-up.js
var ListChevronsDownUp = [
  ["path", { d: "M3 5h8" }],
  ["path", { d: "M3 12h8" }],
  ["path", { d: "M3 19h8" }],
  ["path", { d: "m15 5 3 3 3-3" }],
  ["path", { d: "m15 19 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/list-chevrons-up-down.js
var ListChevronsUpDown = [
  ["path", { d: "M3 5h8" }],
  ["path", { d: "M3 12h8" }],
  ["path", { d: "M3 19h8" }],
  ["path", { d: "m15 8 3-3 3 3" }],
  ["path", { d: "m15 16 3 3 3-3" }]
];

// node_modules/lucide/dist/esm/icons/list-collapse.js
var ListCollapse = [
  ["path", { d: "M10 5h11" }],
  ["path", { d: "M10 12h11" }],
  ["path", { d: "M10 19h11" }],
  ["path", { d: "m3 10 3-3-3-3" }],
  ["path", { d: "m3 20 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/list-end.js
var ListEnd = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M16 12H3" }],
  ["path", { d: "M9 19H3" }],
  ["path", { d: "m16 16-3 3 3 3" }],
  ["path", { d: "M21 5v12a2 2 0 0 1-2 2h-6" }]
];

// node_modules/lucide/dist/esm/icons/list-filter.js
var ListFilter = [
  ["path", { d: "M2 5h20" }],
  ["path", { d: "M6 12h12" }],
  ["path", { d: "M9 19h6" }]
];

// node_modules/lucide/dist/esm/icons/list-filter-plus.js
var ListFilterPlus = [
  ["path", { d: "M12 5H2" }],
  ["path", { d: "M6 12h12" }],
  ["path", { d: "M9 19h6" }],
  ["path", { d: "M16 5h6" }],
  ["path", { d: "M19 8V2" }]
];

// node_modules/lucide/dist/esm/icons/list-indent-decrease.js
var ListIndentDecrease = [
  ["path", { d: "M21 5H11" }],
  ["path", { d: "M21 12H11" }],
  ["path", { d: "M21 19H11" }],
  ["path", { d: "m7 8-4 4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/list-indent-increase.js
var ListIndentIncrease = [
  ["path", { d: "M21 5H11" }],
  ["path", { d: "M21 12H11" }],
  ["path", { d: "M21 19H11" }],
  ["path", { d: "m3 8 4 4-4 4" }]
];

// node_modules/lucide/dist/esm/icons/list-minus.js
var ListMinus = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M11 12H3" }],
  ["path", { d: "M16 19H3" }],
  ["path", { d: "M21 12h-6" }]
];

// node_modules/lucide/dist/esm/icons/list-music.js
var ListMusic = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M11 12H3" }],
  ["path", { d: "M11 19H3" }],
  ["path", { d: "M21 16V5" }],
  ["circle", { cx: "18", cy: "16", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/list-plus.js
var ListPlus = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M11 12H3" }],
  ["path", { d: "M16 19H3" }],
  ["path", { d: "M18 9v6" }],
  ["path", { d: "M21 12h-6" }]
];

// node_modules/lucide/dist/esm/icons/list-restart.js
var ListRestart = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M7 12H3" }],
  ["path", { d: "M7 19H3" }],
  ["path", { d: "M12 18a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L11 14" }],
  ["path", { d: "M11 10v4h4" }]
];

// node_modules/lucide/dist/esm/icons/list-ordered.js
var ListOrdered = [
  ["path", { d: "M11 5h10" }],
  ["path", { d: "M11 12h10" }],
  ["path", { d: "M11 19h10" }],
  ["path", { d: "M4 4h1v5" }],
  ["path", { d: "M4 9h2" }],
  ["path", { d: "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" }]
];

// node_modules/lucide/dist/esm/icons/list-start.js
var ListStart = [
  ["path", { d: "M3 5h6" }],
  ["path", { d: "M3 12h13" }],
  ["path", { d: "M3 19h13" }],
  ["path", { d: "m16 8-3-3 3-3" }],
  ["path", { d: "M21 19V7a2 2 0 0 0-2-2h-6" }]
];

// node_modules/lucide/dist/esm/icons/list-todo.js
var ListTodo = [
  ["path", { d: "M13 5h8" }],
  ["path", { d: "M13 12h8" }],
  ["path", { d: "M13 19h8" }],
  ["path", { d: "m3 17 2 2 4-4" }],
  ["rect", { x: "3", y: "4", width: "6", height: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/list-tree.js
var ListTree = [
  ["path", { d: "M8 5h13" }],
  ["path", { d: "M13 12h8" }],
  ["path", { d: "M13 19h8" }],
  ["path", { d: "M3 10a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M3 5v12a2 2 0 0 0 2 2h3" }]
];

// node_modules/lucide/dist/esm/icons/list-video.js
var ListVideo = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M10 12H3" }],
  ["path", { d: "M10 19H3" }],
  [
    "path",
    {
      d: "M15 12.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/list-x.js
var ListX = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M11 12H3" }],
  ["path", { d: "M16 19H3" }],
  ["path", { d: "m15.5 9.5 5 5" }],
  ["path", { d: "m20.5 9.5-5 5" }]
];

// node_modules/lucide/dist/esm/icons/list.js
var List = [
  ["path", { d: "M3 5h.01" }],
  ["path", { d: "M3 12h.01" }],
  ["path", { d: "M3 19h.01" }],
  ["path", { d: "M8 5h13" }],
  ["path", { d: "M8 12h13" }],
  ["path", { d: "M8 19h13" }]
];

// node_modules/lucide/dist/esm/icons/loader-circle.js
var LoaderCircle = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]];

// node_modules/lucide/dist/esm/icons/loader-pinwheel.js
var LoaderPinwheel = [
  ["path", { d: "M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0" }],
  ["path", { d: "M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6" }],
  ["path", { d: "M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/loader.js
var Loader = [
  ["path", { d: "M12 2v4" }],
  ["path", { d: "m16.2 7.8 2.9-2.9" }],
  ["path", { d: "M18 12h4" }],
  ["path", { d: "m16.2 16.2 2.9 2.9" }],
  ["path", { d: "M12 18v4" }],
  ["path", { d: "m4.9 19.1 2.9-2.9" }],
  ["path", { d: "M2 12h4" }],
  ["path", { d: "m4.9 4.9 2.9 2.9" }]
];

// node_modules/lucide/dist/esm/icons/locate-fixed.js
var LocateFixed = [
  ["line", { x1: "2", x2: "5", y1: "12", y2: "12" }],
  ["line", { x1: "19", x2: "22", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "2", y2: "5" }],
  ["line", { x1: "12", x2: "12", y1: "19", y2: "22" }],
  ["circle", { cx: "12", cy: "12", r: "7" }],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/locate-off.js
var LocateOff = [
  ["path", { d: "M12 19v3" }],
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M18.89 13.24a7 7 0 0 0-8.13-8.13" }],
  ["path", { d: "M19 12h3" }],
  ["path", { d: "M2 12h3" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M7.05 7.05a7 7 0 0 0 9.9 9.9" }]
];

// node_modules/lucide/dist/esm/icons/locate.js
var Locate = [
  ["line", { x1: "2", x2: "5", y1: "12", y2: "12" }],
  ["line", { x1: "19", x2: "22", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "2", y2: "5" }],
  ["line", { x1: "12", x2: "12", y1: "19", y2: "22" }],
  ["circle", { cx: "12", cy: "12", r: "7" }]
];

// node_modules/lucide/dist/esm/icons/lock-keyhole-open.js
var LockKeyholeOpen = [
  ["circle", { cx: "12", cy: "16", r: "1" }],
  ["rect", { width: "18", height: "12", x: "3", y: "10", rx: "2" }],
  ["path", { d: "M7 10V7a5 5 0 0 1 9.33-2.5" }]
];

// node_modules/lucide/dist/esm/icons/lock-keyhole.js
var LockKeyhole = [
  ["circle", { cx: "12", cy: "16", r: "1" }],
  ["rect", { x: "3", y: "10", width: "18", height: "12", rx: "2" }],
  ["path", { d: "M7 10V7a5 5 0 0 1 10 0v3" }]
];

// node_modules/lucide/dist/esm/icons/lock-open.js
var LockOpen = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1" }]
];

// node_modules/lucide/dist/esm/icons/lock.js
var Lock = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }]
];

// node_modules/lucide/dist/esm/icons/log-in.js
var LogIn = [
  ["path", { d: "m10 17 5-5-5-5" }],
  ["path", { d: "M15 12H3" }],
  ["path", { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" }]
];

// node_modules/lucide/dist/esm/icons/log-out.js
var LogOut = [
  ["path", { d: "m16 17 5-5-5-5" }],
  ["path", { d: "M21 12H9" }],
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
];

// node_modules/lucide/dist/esm/icons/logs.js
var Logs = [
  ["path", { d: "M3 5h1" }],
  ["path", { d: "M3 12h1" }],
  ["path", { d: "M3 19h1" }],
  ["path", { d: "M8 5h1" }],
  ["path", { d: "M8 12h1" }],
  ["path", { d: "M8 19h1" }],
  ["path", { d: "M13 5h8" }],
  ["path", { d: "M13 12h8" }],
  ["path", { d: "M13 19h8" }]
];

// node_modules/lucide/dist/esm/icons/lollipop.js
var Lollipop = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }],
  ["path", { d: "M11 11a2 2 0 0 0 4 0 4 4 0 0 0-8 0 6 6 0 0 0 12 0" }]
];

// node_modules/lucide/dist/esm/icons/luggage.js
var Luggage = [
  ["path", { d: "M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" }],
  ["path", { d: "M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" }],
  ["path", { d: "M10 20h4" }],
  ["circle", { cx: "16", cy: "20", r: "2" }],
  ["circle", { cx: "8", cy: "20", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/magnet.js
var Magnet = [
  ["path", { d: "m12 15 4 4" }],
  [
    "path",
    {
      d: "M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z"
    }
  ],
  ["path", { d: "m5 8 4 4" }]
];

// node_modules/lucide/dist/esm/icons/mail-check.js
var MailCheck = [
  ["path", { d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "m16 19 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/mail-minus.js
var MailMinus = [
  ["path", { d: "M22 15V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "M16 19h6" }]
];

// node_modules/lucide/dist/esm/icons/mail-open.js
var MailOpen = [
  [
    "path",
    {
      d: "M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"
    }
  ],
  ["path", { d: "m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" }]
];

// node_modules/lucide/dist/esm/icons/mail-plus.js
var MailPlus = [
  ["path", { d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "M19 16v6" }],
  ["path", { d: "M16 19h6" }]
];

// node_modules/lucide/dist/esm/icons/mail-question-mark.js
var MailQuestionMark = [
  ["path", { d: "M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "M18 15.28c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2" }],
  ["path", { d: "M20 22v.01" }]
];

// node_modules/lucide/dist/esm/icons/mail-search.js
var MailSearch = [
  ["path", { d: "M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h7.5" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }],
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["path", { d: "m22 22-1.5-1.5" }]
];

// node_modules/lucide/dist/esm/icons/mail-warning.js
var MailWarning = [
  ["path", { d: "M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "M20 14v4" }],
  ["path", { d: "M20 22v.01" }]
];

// node_modules/lucide/dist/esm/icons/mail-x.js
var MailX = [
  ["path", { d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }],
  ["path", { d: "m17 17 4 4" }],
  ["path", { d: "m21 17-4 4" }]
];

// node_modules/lucide/dist/esm/icons/mail.js
var Mail = [
  ["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }],
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/mailbox.js
var Mailbox = [
  ["path", { d: "M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" }],
  ["polyline", { points: "15,9 18,9 18,11" }],
  ["path", { d: "M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" }],
  ["line", { x1: "6", x2: "7", y1: "10", y2: "10" }]
];

// node_modules/lucide/dist/esm/icons/mails.js
var Mails = [
  ["path", { d: "M17 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 1-1.732" }],
  ["path", { d: "m22 5.5-6.419 4.179a2 2 0 0 1-2.162 0L7 5.5" }],
  ["rect", { x: "7", y: "3", width: "15", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/map-minus.js
var MapMinus = [
  [
    "path",
    {
      d: "m11 19-1.106-.552a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V14"
    }
  ],
  ["path", { d: "M15 5.764V14" }],
  ["path", { d: "M21 18h-6" }],
  ["path", { d: "M9 3.236v15" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-check-inside.js
var MapPinCheckInside = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    }
  ],
  ["path", { d: "m9 10 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-check.js
var MapPinCheck = [
  [
    "path",
    {
      d: "M19.43 12.935c.357-.967.57-1.955.57-2.935a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32.197 32.197 0 0 0 .813-.728"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "m16 18 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-house.js
var MapPinHouse = [
  [
    "path",
    {
      d: "M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z"
    }
  ],
  ["path", { d: "M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" }],
  ["path", { d: "M18 22v-3" }],
  ["circle", { cx: "10", cy: "10", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-minus.js
var MapPinMinus = [
  [
    "path",
    {
      d: "M18.977 14C19.6 12.701 20 11.343 20 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32 32 0 0 0 .824-.738"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "M16 18h6" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-minus-inside.js
var MapPinMinusInside = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    }
  ],
  ["path", { d: "M9 10h6" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-off.js
var MapPinOff = [
  ["path", { d: "M12.75 7.09a3 3 0 0 1 2.16 2.16" }],
  [
    "path",
    {
      d: "M17.072 17.072c-1.634 2.17-3.527 3.912-4.471 4.727a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 1.432-4.568"
    }
  ],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.475 2.818A8 8 0 0 1 20 10c0 1.183-.31 2.377-.81 3.533" }],
  ["path", { d: "M9.13 9.13a3 3 0 0 0 3.74 3.74" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-pen.js
var MapPinPen = [
  ["path", { d: "M17.97 9.304A8 8 0 0 0 2 10c0 4.69 4.887 9.562 7.022 11.468" }],
  [
    "path",
    {
      d: "M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ],
  ["circle", { cx: "10", cy: "10", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-plus-inside.js
var MapPinPlusInside = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    }
  ],
  ["path", { d: "M12 7v6" }],
  ["path", { d: "M9 10h6" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-plus.js
var MapPinPlus = [
  [
    "path",
    {
      d: "M19.914 11.105A7.298 7.298 0 0 0 20 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32 32 0 0 0 .824-.738"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "M16 18h6" }],
  ["path", { d: "M19 15v6" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-x-inside.js
var MapPinXInside = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    }
  ],
  ["path", { d: "m14.5 7.5-5 5" }],
  ["path", { d: "m9.5 7.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/map-pin-x.js
var MapPinX = [
  [
    "path",
    {
      d: "M19.752 11.901A7.78 7.78 0 0 0 20 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 19 19 0 0 0 .09-.077"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "m21.5 15.5-5 5" }],
  ["path", { d: "m21.5 20.5-5-5" }]
];

// node_modules/lucide/dist/esm/icons/map-pin.js
var MapPin = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/map-pinned.js
var MapPinned = [
  [
    "path",
    {
      d: "M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "2" }],
  [
    "path",
    {
      d: "M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/map.js
var Map2 = [
  [
    "path",
    {
      d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
    }
  ],
  ["path", { d: "M15 5.764v15" }],
  ["path", { d: "M9 3.236v15" }]
];

// node_modules/lucide/dist/esm/icons/map-plus.js
var MapPlus = [
  [
    "path",
    {
      d: "m11 19-1.106-.552a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V12"
    }
  ],
  ["path", { d: "M15 5.764V12" }],
  ["path", { d: "M18 15v6" }],
  ["path", { d: "M21 18h-6" }],
  ["path", { d: "M9 3.236v15" }]
];

// node_modules/lucide/dist/esm/icons/mars-stroke.js
var MarsStroke = [
  ["path", { d: "m14 6 4 4" }],
  ["path", { d: "M17 3h4v4" }],
  ["path", { d: "m21 3-7.75 7.75" }],
  ["circle", { cx: "9", cy: "15", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/mars.js
var Mars = [
  ["path", { d: "M16 3h5v5" }],
  ["path", { d: "m21 3-6.75 6.75" }],
  ["circle", { cx: "10", cy: "14", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/martini.js
var Martini = [
  ["path", { d: "M8 22h8" }],
  ["path", { d: "M12 11v11" }],
  ["path", { d: "m19 3-7 8-7-8Z" }]
];

// node_modules/lucide/dist/esm/icons/maximize-2.js
var Maximize2 = [
  ["path", { d: "M15 3h6v6" }],
  ["path", { d: "m21 3-7 7" }],
  ["path", { d: "m3 21 7-7" }],
  ["path", { d: "M9 21H3v-6" }]
];

// node_modules/lucide/dist/esm/icons/maximize.js
var Maximize = [
  ["path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }],
  ["path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }]
];

// node_modules/lucide/dist/esm/icons/medal.js
var Medal = [
  [
    "path",
    {
      d: "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"
    }
  ],
  ["path", { d: "M11 12 5.12 2.2" }],
  ["path", { d: "m13 12 5.88-9.8" }],
  ["path", { d: "M8 7h8" }],
  ["circle", { cx: "12", cy: "17", r: "5" }],
  ["path", { d: "M12 18v-2h-.5" }]
];

// node_modules/lucide/dist/esm/icons/megaphone-off.js
var MegaphoneOff = [
  ["path", { d: "M11.636 6A13 13 0 0 0 19.4 3.2 1 1 0 0 1 21 4v11.344" }],
  ["path", { d: "M14.378 14.357A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" }],
  ["path", { d: "M8 8v6" }]
];

// node_modules/lucide/dist/esm/icons/megaphone.js
var Megaphone = [
  [
    "path",
    {
      d: "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
    }
  ],
  ["path", { d: "M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" }],
  ["path", { d: "M8 6v8" }]
];

// node_modules/lucide/dist/esm/icons/meh.js
var Meh = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["line", { x1: "8", x2: "16", y1: "15", y2: "15" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/memory-stick.js
var MemoryStick = [
  ["path", { d: "M6 19v-3" }],
  ["path", { d: "M10 19v-3" }],
  ["path", { d: "M14 19v-3" }],
  ["path", { d: "M18 19v-3" }],
  ["path", { d: "M8 11V9" }],
  ["path", { d: "M16 11V9" }],
  ["path", { d: "M12 11V9" }],
  ["path", { d: "M2 15h20" }],
  [
    "path",
    {
      d: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/menu.js
var Menu = [
  ["path", { d: "M4 5h16" }],
  ["path", { d: "M4 12h16" }],
  ["path", { d: "M4 19h16" }]
];

// node_modules/lucide/dist/esm/icons/merge.js
var Merge = [
  ["path", { d: "m8 6 4-4 4 4" }],
  ["path", { d: "M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" }],
  ["path", { d: "m20 22-5-5" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-code.js
var MessageCircleCode = [
  ["path", { d: "m10 9-3 3 3 3" }],
  ["path", { d: "m14 15 3-3-3-3" }],
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/message-circle-dashed.js
var MessageCircleDashed = [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0" }],
  ["path", { d: "M17.609 3.72a10 10 0 0 1 2.69 2.7" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8" }],
  ["path", { d: "M20.28 17.61a10 10 0 0 1-2.7 2.69" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69" }],
  ["path", { d: "m6.163 21.117-2.906.85a1 1 0 0 1-1.236-1.169l.965-2.98" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-heart.js
var MessageCircleHeart = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  [
    "path",
    {
      d: "M7.828 13.07A3 3 0 0 1 12 8.764a3 3 0 0 1 5.004 2.224 3 3 0 0 1-.832 2.083l-3.447 3.62a1 1 0 0 1-1.45-.001z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/message-circle-more.js
var MessageCircleMore = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "M8 12h.01" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M16 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-off.js
var MessageCircleOff = [
  ["path", { d: "m2 2 20 20" }],
  [
    "path",
    {
      d: "M4.93 4.929a10 10 0 0 0-1.938 11.412 2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 0 0 11.302-1.989"
    }
  ],
  ["path", { d: "M8.35 2.69A10 10 0 0 1 21.3 15.65" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-plus.js
var MessageCirclePlus = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "M12 8v8" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-question-mark.js
var MessageCircleQuestionMark = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }],
  ["path", { d: "M12 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-reply.js
var MessageCircleReply = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "m10 15-3-3 3-3" }],
  ["path", { d: "M7 12h8a2 2 0 0 1 2 2v1" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-warning.js
var MessageCircleWarning = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "M12 8v4" }],
  ["path", { d: "M12 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/message-circle-x.js
var MessageCircleX = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "m9 9 6 6" }]
];

// node_modules/lucide/dist/esm/icons/message-circle.js
var MessageCircle = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/message-square-code.js
var MessageSquareCode = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "m10 8-3 3 3 3" }],
  ["path", { d: "m14 14 3-3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/message-square-dashed.js
var MessageSquareDashed = [
  ["path", { d: "M12 19h.01" }],
  ["path", { d: "M12 3h.01" }],
  ["path", { d: "M16 19h.01" }],
  ["path", { d: "M16 3h.01" }],
  ["path", { d: "M2 13h.01" }],
  ["path", { d: "M2 17v4.286a.71.71 0 0 0 1.212.502l2.202-2.202A2 2 0 0 1 6.828 19H8" }],
  ["path", { d: "M2 5a2 2 0 0 1 2-2" }],
  ["path", { d: "M2 9h.01" }],
  ["path", { d: "M20 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M22 13h.01" }],
  ["path", { d: "M22 17a2 2 0 0 1-2 2" }],
  ["path", { d: "M22 9h.01" }],
  ["path", { d: "M8 3h.01" }]
];

// node_modules/lucide/dist/esm/icons/message-square-diff.js
var MessageSquareDiff = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M10 15h4" }],
  ["path", { d: "M10 9h4" }],
  ["path", { d: "M12 7v4" }]
];

// node_modules/lucide/dist/esm/icons/message-square-dot.js
var MessageSquareDot = [
  [
    "path",
    {
      d: "M12.7 3H4a2 2 0 0 0-2 2v16.286a.71.71 0 0 0 1.212.502l2.202-2.202A2 2 0 0 1 6.828 19H20a2 2 0 0 0 2-2v-4.7"
    }
  ],
  ["circle", { cx: "19", cy: "6", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/message-square-heart.js
var MessageSquareHeart = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  [
    "path",
    {
      d: "M7.5 9.5c0 .687.265 1.383.697 1.844l3.009 3.264a1.14 1.14 0 0 0 .407.314 1 1 0 0 0 .783-.004 1.14 1.14 0 0 0 .398-.31l3.008-3.264A2.77 2.77 0 0 0 16.5 9.5 2.5 2.5 0 0 0 12 8a2.5 2.5 0 0 0-4.5 1.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/message-square-lock.js
var MessageSquareLock = [
  [
    "path",
    {
      d: "M22 8.5V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16.286a.71.71 0 0 0 1.212.502l2.202-2.202A2 2 0 0 1 6.828 19H10"
    }
  ],
  ["path", { d: "M20 15v-2a2 2 0 0 0-4 0v2" }],
  ["rect", { x: "14", y: "15", width: "8", height: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/message-square-more.js
var MessageSquareMore = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M12 11h.01" }],
  ["path", { d: "M16 11h.01" }],
  ["path", { d: "M8 11h.01" }]
];

// node_modules/lucide/dist/esm/icons/message-square-off.js
var MessageSquareOff = [
  [
    "path",
    {
      d: "M19 19H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.7.7 0 0 1 2 21.286V5a2 2 0 0 1 1.184-1.826"
    }
  ],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M8.656 3H20a2 2 0 0 1 2 2v11.344" }]
];

// node_modules/lucide/dist/esm/icons/message-square-plus.js
var MessageSquarePlus = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M12 8v6" }],
  ["path", { d: "M9 11h6" }]
];

// node_modules/lucide/dist/esm/icons/message-square-quote.js
var MessageSquareQuote = [
  ["path", { d: "M14 14a2 2 0 0 0 2-2V8h-2" }],
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M8 14a2 2 0 0 0 2-2V8H8" }]
];

// node_modules/lucide/dist/esm/icons/message-square-share.js
var MessageSquareShare = [
  [
    "path",
    {
      d: "M12 3H4a2 2 0 0 0-2 2v16.286a.71.71 0 0 0 1.212.502l2.202-2.202A2 2 0 0 1 6.828 19H20a2 2 0 0 0 2-2v-4"
    }
  ],
  ["path", { d: "M16 3h6v6" }],
  ["path", { d: "m16 9 6-6" }]
];

// node_modules/lucide/dist/esm/icons/message-square-reply.js
var MessageSquareReply = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "m10 8-3 3 3 3" }],
  ["path", { d: "M17 14v-1a2 2 0 0 0-2-2H7" }]
];

// node_modules/lucide/dist/esm/icons/message-square-text.js
var MessageSquareText = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M7 11h10" }],
  ["path", { d: "M7 15h6" }],
  ["path", { d: "M7 7h8" }]
];

// node_modules/lucide/dist/esm/icons/message-square-warning.js
var MessageSquareWarning = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "M12 15h.01" }],
  ["path", { d: "M12 7v4" }]
];

// node_modules/lucide/dist/esm/icons/message-square-x.js
var MessageSquareX = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ],
  ["path", { d: "m14.5 8.5-5 5" }],
  ["path", { d: "m9.5 8.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/message-square.js
var MessageSquare = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/messages-square.js
var MessagesSquare = [
  [
    "path",
    {
      d: "M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
    }
  ],
  [
    "path",
    {
      d: "M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/mic-off.js
var MicOff = [
  ["path", { d: "M12 19v3" }],
  ["path", { d: "M15 9.34V5a3 3 0 0 0-5.68-1.33" }],
  ["path", { d: "M16.95 16.95A7 7 0 0 1 5 12v-2" }],
  ["path", { d: "M18.89 13.23A7 7 0 0 0 19 12v-2" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M9 9v3a3 3 0 0 0 5.12 2.12" }]
];

// node_modules/lucide/dist/esm/icons/mic-vocal.js
var MicVocal = [
  ["path", { d: "m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12" }],
  [
    "path",
    {
      d: "M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"
    }
  ],
  ["circle", { cx: "16", cy: "7", r: "5" }]
];

// node_modules/lucide/dist/esm/icons/mic.js
var Mic = [
  ["path", { d: "M12 19v3" }],
  ["path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }],
  ["rect", { x: "9", y: "2", width: "6", height: "13", rx: "3" }]
];

// node_modules/lucide/dist/esm/icons/microchip.js
var Microchip = [
  ["path", { d: "M18 12h2" }],
  ["path", { d: "M18 16h2" }],
  ["path", { d: "M18 20h2" }],
  ["path", { d: "M18 4h2" }],
  ["path", { d: "M18 8h2" }],
  ["path", { d: "M4 12h2" }],
  ["path", { d: "M4 16h2" }],
  ["path", { d: "M4 20h2" }],
  ["path", { d: "M4 4h2" }],
  ["path", { d: "M4 8h2" }],
  [
    "path",
    {
      d: "M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1.5c-.276 0-.494.227-.562.495a2 2 0 0 1-3.876 0C9.994 2.227 9.776 2 9.5 2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/microscope.js
var Microscope = [
  ["path", { d: "M6 18h8" }],
  ["path", { d: "M3 22h18" }],
  ["path", { d: "M14 22a7 7 0 1 0 0-14h-1" }],
  ["path", { d: "M9 14h2" }],
  ["path", { d: "M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" }],
  ["path", { d: "M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" }]
];

// node_modules/lucide/dist/esm/icons/microwave.js
var Microwave = [
  ["rect", { width: "20", height: "15", x: "2", y: "4", rx: "2" }],
  ["rect", { width: "8", height: "7", x: "6", y: "8", rx: "1" }],
  ["path", { d: "M18 8v7" }],
  ["path", { d: "M6 19v2" }],
  ["path", { d: "M18 19v2" }]
];

// node_modules/lucide/dist/esm/icons/milestone.js
var Milestone = [
  ["path", { d: "M12 13v8" }],
  ["path", { d: "M12 3v3" }],
  [
    "path",
    {
      d: "M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/milk.js
var Milk = [
  ["path", { d: "M8 2h8" }],
  [
    "path",
    {
      d: "M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2"
    }
  ],
  ["path", { d: "M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" }]
];

// node_modules/lucide/dist/esm/icons/milk-off.js
var MilkOff = [
  ["path", { d: "M8 2h8" }],
  [
    "path",
    {
      d: "M9 2v1.343M15 2v2.789a4 4 0 0 0 .672 2.219l.656.984a4 4 0 0 1 .672 2.22v1.131M7.8 7.8l-.128.192A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3"
    }
  ],
  ["path", { d: "M7 15a6.47 6.47 0 0 1 5 0 6.472 6.472 0 0 0 3.435.435" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/minimize-2.js
var Minimize2 = [
  ["path", { d: "m14 10 7-7" }],
  ["path", { d: "M20 10h-6V4" }],
  ["path", { d: "m3 21 7-7" }],
  ["path", { d: "M4 14h6v6" }]
];

// node_modules/lucide/dist/esm/icons/minimize.js
var Minimize = [
  ["path", { d: "M8 3v3a2 2 0 0 1-2 2H3" }],
  ["path", { d: "M21 8h-3a2 2 0 0 1-2-2V3" }],
  ["path", { d: "M3 16h3a2 2 0 0 1 2 2v3" }],
  ["path", { d: "M16 21v-3a2 2 0 0 1 2-2h3" }]
];

// node_modules/lucide/dist/esm/icons/minus.js
var Minus = [["path", { d: "M5 12h14" }]];

// node_modules/lucide/dist/esm/icons/monitor-check.js
var MonitorCheck = [
  ["path", { d: "m9 10 2 2 4-4" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }]
];

// node_modules/lucide/dist/esm/icons/monitor-cloud.js
var MonitorCloud = [
  ["path", { d: "M11 13a3 3 0 1 1 2.83-4H14a2 2 0 0 1 0 4z" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }],
  ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/monitor-cog.js
var MonitorCog = [
  ["path", { d: "M12 17v4" }],
  ["path", { d: "m14.305 7.53.923-.382" }],
  ["path", { d: "m15.228 4.852-.923-.383" }],
  ["path", { d: "m16.852 3.228-.383-.924" }],
  ["path", { d: "m16.852 8.772-.383.923" }],
  ["path", { d: "m19.148 3.228.383-.924" }],
  ["path", { d: "m19.53 9.696-.382-.924" }],
  ["path", { d: "m20.772 4.852.924-.383" }],
  ["path", { d: "m20.772 7.148.924.383" }],
  ["path", { d: "M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" }],
  ["path", { d: "M8 21h8" }],
  ["circle", { cx: "18", cy: "6", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/monitor-dot.js
var MonitorDot = [
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M22 12.307V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8.693" }],
  ["path", { d: "M8 21h8" }],
  ["circle", { cx: "19", cy: "6", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/monitor-down.js
var MonitorDown = [
  ["path", { d: "M12 13V7" }],
  ["path", { d: "m15 10-3 3-3-3" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }]
];

// node_modules/lucide/dist/esm/icons/monitor-off.js
var MonitorOff = [
  ["path", { d: "M17 17H4a2 2 0 0 1-2-2V5c0-1.5 1-2 1-2" }],
  ["path", { d: "M22 15V5a2 2 0 0 0-2-2H9" }],
  ["path", { d: "M8 21h8" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/monitor-pause.js
var MonitorPause = [
  ["path", { d: "M10 13V7" }],
  ["path", { d: "M14 13V7" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }]
];

// node_modules/lucide/dist/esm/icons/monitor-play.js
var MonitorPlay = [
  [
    "path",
    {
      d: "M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"
    }
  ],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }],
  ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/monitor-smartphone.js
var MonitorSmartphone = [
  ["path", { d: "M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" }],
  ["path", { d: "M10 19v-3.96 3.15" }],
  ["path", { d: "M7 19h5" }],
  ["rect", { width: "6", height: "10", x: "16", y: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/monitor-speaker.js
var MonitorSpeaker = [
  ["path", { d: "M5.5 20H8" }],
  ["path", { d: "M17 9h.01" }],
  ["rect", { width: "10", height: "16", x: "12", y: "4", rx: "2" }],
  ["path", { d: "M8 6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4" }],
  ["circle", { cx: "17", cy: "15", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/monitor-stop.js
var MonitorStop = [
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }],
  ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }],
  ["rect", { x: "9", y: "7", width: "6", height: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/monitor-up.js
var MonitorUp = [
  ["path", { d: "m9 10 3-3 3 3" }],
  ["path", { d: "M12 13V7" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }]
];

// node_modules/lucide/dist/esm/icons/monitor-x.js
var MonitorX = [
  ["path", { d: "m14.5 12.5-5-5" }],
  ["path", { d: "m9.5 12.5 5-5" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }]
];

// node_modules/lucide/dist/esm/icons/monitor.js
var Monitor = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/moon-star.js
var MoonStar = [
  ["path", { d: "M18 5h4" }],
  ["path", { d: "M20 3v4" }],
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/moon.js
var Moon = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/motorbike.js
var Motorbike = [
  ["path", { d: "m18 14-1-3" }],
  ["path", { d: "m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81" }],
  ["path", { d: "M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5" }],
  ["circle", { cx: "19", cy: "17", r: "3" }],
  ["circle", { cx: "5", cy: "17", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/mountain-snow.js
var MountainSnow = [
  ["path", { d: "m8 3 4 8 5-5 5 15H2L8 3z" }],
  ["path", { d: "M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19" }]
];

// node_modules/lucide/dist/esm/icons/mountain.js
var Mountain = [["path", { d: "m8 3 4 8 5-5 5 15H2L8 3z" }]];

// node_modules/lucide/dist/esm/icons/mouse-off.js
var MouseOff = [
  ["path", { d: "M12 6v.343" }],
  ["path", { d: "M18.218 18.218A7 7 0 0 1 5 15V9a7 7 0 0 1 .782-3.218" }],
  ["path", { d: "M19 13.343V9A7 7 0 0 0 8.56 2.902" }],
  ["path", { d: "M22 22 2 2" }]
];

// node_modules/lucide/dist/esm/icons/mouse-pointer-2.js
var MousePointer2 = [
  [
    "path",
    {
      d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/mouse-pointer-ban.js
var MousePointerBan = [
  [
    "path",
    {
      d: "M2.034 2.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.944L8.204 7.545a1 1 0 0 0-.66.66l-1.066 3.443a.5.5 0 0 1-.944.033z"
    }
  ],
  ["circle", { cx: "16", cy: "16", r: "6" }],
  ["path", { d: "m11.8 11.8 8.4 8.4" }]
];

// node_modules/lucide/dist/esm/icons/mouse-pointer-click.js
var MousePointerClick = [
  ["path", { d: "M14 4.1 12 6" }],
  ["path", { d: "m5.1 8-2.9-.8" }],
  ["path", { d: "m6 12-1.9 2" }],
  ["path", { d: "M7.2 2.2 8 5.1" }],
  [
    "path",
    {
      d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/mouse-pointer.js
var MousePointer = [
  ["path", { d: "M12.586 12.586 19 19" }],
  [
    "path",
    {
      d: "M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/mouse.js
var Mouse = [
  ["rect", { x: "5", y: "2", width: "14", height: "20", rx: "7" }],
  ["path", { d: "M12 6v4" }]
];

// node_modules/lucide/dist/esm/icons/move-3d.js
var Move3d = [
  ["path", { d: "M5 3v16h16" }],
  ["path", { d: "m5 19 6-6" }],
  ["path", { d: "m2 6 3-3 3 3" }],
  ["path", { d: "m18 16 3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/move-diagonal-2.js
var MoveDiagonal2 = [
  ["path", { d: "M19 13v6h-6" }],
  ["path", { d: "M5 11V5h6" }],
  ["path", { d: "m5 5 14 14" }]
];

// node_modules/lucide/dist/esm/icons/move-diagonal.js
var MoveDiagonal = [
  ["path", { d: "M11 19H5v-6" }],
  ["path", { d: "M13 5h6v6" }],
  ["path", { d: "M19 5 5 19" }]
];

// node_modules/lucide/dist/esm/icons/move-down-left.js
var MoveDownLeft = [
  ["path", { d: "M11 19H5V13" }],
  ["path", { d: "M19 5L5 19" }]
];

// node_modules/lucide/dist/esm/icons/move-down-right.js
var MoveDownRight = [
  ["path", { d: "M19 13V19H13" }],
  ["path", { d: "M5 5L19 19" }]
];

// node_modules/lucide/dist/esm/icons/move-down.js
var MoveDown = [
  ["path", { d: "M8 18L12 22L16 18" }],
  ["path", { d: "M12 2V22" }]
];

// node_modules/lucide/dist/esm/icons/move-horizontal.js
var MoveHorizontal = [
  ["path", { d: "m18 8 4 4-4 4" }],
  ["path", { d: "M2 12h20" }],
  ["path", { d: "m6 8-4 4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/move-left.js
var MoveLeft = [
  ["path", { d: "M6 8L2 12L6 16" }],
  ["path", { d: "M2 12H22" }]
];

// node_modules/lucide/dist/esm/icons/move-right.js
var MoveRight = [
  ["path", { d: "M18 8L22 12L18 16" }],
  ["path", { d: "M2 12H22" }]
];

// node_modules/lucide/dist/esm/icons/move-up-left.js
var MoveUpLeft = [
  ["path", { d: "M5 11V5H11" }],
  ["path", { d: "M5 5L19 19" }]
];

// node_modules/lucide/dist/esm/icons/move-up-right.js
var MoveUpRight = [
  ["path", { d: "M13 5H19V11" }],
  ["path", { d: "M19 5L5 19" }]
];

// node_modules/lucide/dist/esm/icons/move-up.js
var MoveUp = [
  ["path", { d: "M8 6L12 2L16 6" }],
  ["path", { d: "M12 2V22" }]
];

// node_modules/lucide/dist/esm/icons/move-vertical.js
var MoveVertical = [
  ["path", { d: "M12 2v20" }],
  ["path", { d: "m8 18 4 4 4-4" }],
  ["path", { d: "m8 6 4-4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/move.js
var Move = [
  ["path", { d: "M12 2v20" }],
  ["path", { d: "m15 19-3 3-3-3" }],
  ["path", { d: "m19 9 3 3-3 3" }],
  ["path", { d: "M2 12h20" }],
  ["path", { d: "m5 9-3 3 3 3" }],
  ["path", { d: "m9 5 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/music-2.js
var Music2 = [
  ["circle", { cx: "8", cy: "18", r: "4" }],
  ["path", { d: "M12 18V2l7 4" }]
];

// node_modules/lucide/dist/esm/icons/music-3.js
var Music3 = [
  ["circle", { cx: "12", cy: "18", r: "4" }],
  ["path", { d: "M16 18V2" }]
];

// node_modules/lucide/dist/esm/icons/music-4.js
var Music4 = [
  ["path", { d: "M9 18V5l12-2v13" }],
  ["path", { d: "m9 9 12-2" }],
  ["circle", { cx: "6", cy: "18", r: "3" }],
  ["circle", { cx: "18", cy: "16", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/music.js
var Music = [
  ["path", { d: "M9 18V5l12-2v13" }],
  ["circle", { cx: "6", cy: "18", r: "3" }],
  ["circle", { cx: "18", cy: "16", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/navigation-2-off.js
var Navigation2Off = [
  ["path", { d: "M9.31 9.31 5 21l7-4 7 4-1.17-3.17" }],
  ["path", { d: "M14.53 8.88 12 2l-1.17 3.17" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/navigation-2.js
var Navigation2 = [["polygon", { points: "12 2 19 21 12 17 5 21 12 2" }]];

// node_modules/lucide/dist/esm/icons/navigation-off.js
var NavigationOff = [
  ["path", { d: "M8.43 8.43 3 11l8 2 2 8 2.57-5.43" }],
  ["path", { d: "M17.39 11.73 22 2l-9.73 4.61" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/navigation.js
var Navigation = [["polygon", { points: "3 11 22 2 13 21 11 13 3 11" }]];

// node_modules/lucide/dist/esm/icons/network.js
var Network = [
  ["rect", { x: "16", y: "16", width: "6", height: "6", rx: "1" }],
  ["rect", { x: "2", y: "16", width: "6", height: "6", rx: "1" }],
  ["rect", { x: "9", y: "2", width: "6", height: "6", rx: "1" }],
  ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" }],
  ["path", { d: "M12 12V8" }]
];

// node_modules/lucide/dist/esm/icons/newspaper.js
var Newspaper = [
  ["path", { d: "M15 18h-5" }],
  ["path", { d: "M18 14h-8" }],
  [
    "path",
    {
      d: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"
    }
  ],
  ["rect", { width: "8", height: "4", x: "10", y: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/nfc.js
var Nfc = [
  ["path", { d: "M6 8.32a7.43 7.43 0 0 1 0 7.36" }],
  ["path", { d: "M9.46 6.21a11.76 11.76 0 0 1 0 11.58" }],
  ["path", { d: "M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" }],
  ["path", { d: "M16.37 2a20.16 20.16 0 0 1 0 20" }]
];

// node_modules/lucide/dist/esm/icons/non-binary.js
var NonBinary = [
  ["path", { d: "M12 2v10" }],
  ["path", { d: "m8.5 4 7 4" }],
  ["path", { d: "m8.5 8 7-4" }],
  ["circle", { cx: "12", cy: "17", r: "5" }]
];

// node_modules/lucide/dist/esm/icons/notebook-pen.js
var NotebookPen = [
  ["path", { d: "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" }],
  ["path", { d: "M2 6h4" }],
  ["path", { d: "M2 10h4" }],
  ["path", { d: "M2 14h4" }],
  ["path", { d: "M2 18h4" }],
  [
    "path",
    {
      d: "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/notebook-tabs.js
var NotebookTabs = [
  ["path", { d: "M2 6h4" }],
  ["path", { d: "M2 10h4" }],
  ["path", { d: "M2 14h4" }],
  ["path", { d: "M2 18h4" }],
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2" }],
  ["path", { d: "M15 2v20" }],
  ["path", { d: "M15 7h5" }],
  ["path", { d: "M15 12h5" }],
  ["path", { d: "M15 17h5" }]
];

// node_modules/lucide/dist/esm/icons/notebook-text.js
var NotebookText = [
  ["path", { d: "M2 6h4" }],
  ["path", { d: "M2 10h4" }],
  ["path", { d: "M2 14h4" }],
  ["path", { d: "M2 18h4" }],
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2" }],
  ["path", { d: "M9.5 8h5" }],
  ["path", { d: "M9.5 12H16" }],
  ["path", { d: "M9.5 16H14" }]
];

// node_modules/lucide/dist/esm/icons/notebook.js
var Notebook = [
  ["path", { d: "M2 6h4" }],
  ["path", { d: "M2 10h4" }],
  ["path", { d: "M2 14h4" }],
  ["path", { d: "M2 18h4" }],
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2" }],
  ["path", { d: "M16 2v20" }]
];

// node_modules/lucide/dist/esm/icons/notepad-text-dashed.js
var NotepadTextDashed = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M12 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["path", { d: "M16 4h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M20 12v2" }],
  ["path", { d: "M20 18v2a2 2 0 0 1-2 2h-1" }],
  ["path", { d: "M13 22h-2" }],
  ["path", { d: "M7 22H6a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M4 14v-2" }],
  ["path", { d: "M4 8V6a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M8 10h6" }],
  ["path", { d: "M8 14h8" }],
  ["path", { d: "M8 18h5" }]
];

// node_modules/lucide/dist/esm/icons/notepad-text.js
var NotepadText = [
  ["path", { d: "M8 2v4" }],
  ["path", { d: "M12 2v4" }],
  ["path", { d: "M16 2v4" }],
  ["rect", { width: "16", height: "18", x: "4", y: "4", rx: "2" }],
  ["path", { d: "M8 10h6" }],
  ["path", { d: "M8 14h8" }],
  ["path", { d: "M8 18h5" }]
];

// node_modules/lucide/dist/esm/icons/nut-off.js
var NutOff = [
  ["path", { d: "M12 4V2" }],
  [
    "path",
    {
      d: "M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592a7.01 7.01 0 0 0 4.125-2.939"
    }
  ],
  ["path", { d: "M19 10v3.343" }],
  [
    "path",
    {
      d: "M12 12c-1.349-.573-1.905-1.005-2.5-2-.546.902-1.048 1.353-2.5 2-1.018-.644-1.46-1.08-2-2-1.028.71-1.69.918-3 1 1.081-1.048 1.757-2.03 2-3 .194-.776.84-1.551 1.79-2.21m11.654 5.997c.887-.457 1.28-.891 1.556-1.787 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4-.74 0-1.461.068-2.15.192"
    }
  ],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/nut.js
var Nut = [
  ["path", { d: "M12 4V2" }],
  [
    "path",
    {
      d: "M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4"
    }
  ],
  [
    "path",
    {
      d: "M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/octagon-alert.js
var OctagonAlert = [
  ["path", { d: "M12 16h.01" }],
  ["path", { d: "M12 8v4" }],
  [
    "path",
    {
      d: "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/octagon-minus.js
var OctagonMinus = [
  [
    "path",
    {
      d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
    }
  ],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/octagon-pause.js
var OctagonPause = [
  ["path", { d: "M10 15V9" }],
  ["path", { d: "M14 15V9" }],
  [
    "path",
    {
      d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/octagon-x.js
var OctagonX = [
  ["path", { d: "m15 9-6 6" }],
  [
    "path",
    {
      d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
    }
  ],
  ["path", { d: "m9 9 6 6" }]
];

// node_modules/lucide/dist/esm/icons/octagon.js
var Octagon = [
  [
    "path",
    {
      d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/omega.js
var Omega = [
  [
    "path",
    {
      d: "M3 20h4.5a.5.5 0 0 0 .5-.5v-.282a.52.52 0 0 0-.247-.437 8 8 0 1 1 8.494-.001.52.52 0 0 0-.247.438v.282a.5.5 0 0 0 .5.5H21"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/option.js
var Option = [
  ["path", { d: "M3 3h6l6 18h6" }],
  ["path", { d: "M14 3h7" }]
];

// node_modules/lucide/dist/esm/icons/orbit.js
var Orbit = [
  ["path", { d: "M20.341 6.484A10 10 0 0 1 10.266 21.85" }],
  ["path", { d: "M3.659 17.516A10 10 0 0 1 13.74 2.152" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["circle", { cx: "19", cy: "5", r: "2" }],
  ["circle", { cx: "5", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/origami.js
var Origami = [
  ["path", { d: "M12 12V4a1 1 0 0 1 1-1h6.297a1 1 0 0 1 .651 1.759l-4.696 4.025" }],
  [
    "path",
    { d: "m12 21-7.414-7.414A2 2 0 0 1 4 12.172V6.415a1.002 1.002 0 0 1 1.707-.707L20 20.009" }
  ],
  [
    "path",
    {
      d: "m12.214 3.381 8.414 14.966a1 1 0 0 1-.167 1.199l-1.168 1.163a1 1 0 0 1-.706.291H6.351a1 1 0 0 1-.625-.219L3.25 18.8a1 1 0 0 1 .631-1.781l4.165.027"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/package-2.js
var Package2 = [
  ["path", { d: "M12 3v6" }],
  [
    "path",
    {
      d: "M16.76 3a2 2 0 0 1 1.8 1.1l2.23 4.479a2 2 0 0 1 .21.891V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.472a2 2 0 0 1 .211-.894L5.45 4.1A2 2 0 0 1 7.24 3z"
    }
  ],
  ["path", { d: "M3.054 9.013h17.893" }]
];

// node_modules/lucide/dist/esm/icons/package-check.js
var PackageCheck = [
  ["path", { d: "m16 16 2 2 4-4" }],
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/package-minus.js
var PackageMinus = [
  ["path", { d: "M16 16h6" }],
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/package-open.js
var PackageOpen = [
  ["path", { d: "M12 22v-9" }],
  [
    "path",
    {
      d: "M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"
    }
  ],
  [
    "path",
    {
      d: "M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"
    }
  ],
  [
    "path",
    {
      d: "M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/package-plus.js
var PackagePlus = [
  ["path", { d: "M16 16h6" }],
  ["path", { d: "M19 13v6" }],
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/package-search.js
var PackageSearch = [
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }],
  ["circle", { cx: "18.5", cy: "15.5", r: "2.5" }],
  ["path", { d: "M20.27 17.27 22 19" }]
];

// node_modules/lucide/dist/esm/icons/package-x.js
var PackageX = [
  [
    "path",
    {
      d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"
    }
  ],
  ["path", { d: "m7.5 4.27 9 5.15" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "12" }],
  ["path", { d: "m17 13 5 5m-5 0 5-5" }]
];

// node_modules/lucide/dist/esm/icons/package.js
var Package = [
  [
    "path",
    {
      d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
    }
  ],
  ["path", { d: "M12 22V12" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["path", { d: "m7.5 4.27 9 5.15" }]
];

// node_modules/lucide/dist/esm/icons/paint-bucket.js
var PaintBucket = [
  ["path", { d: "m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" }],
  ["path", { d: "m5 2 5 5" }],
  ["path", { d: "M2 13h15" }],
  ["path", { d: "M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" }]
];

// node_modules/lucide/dist/esm/icons/paint-roller.js
var PaintRoller = [
  ["rect", { width: "16", height: "6", x: "2", y: "2", rx: "2" }],
  ["path", { d: "M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" }],
  ["rect", { width: "4", height: "6", x: "8", y: "16", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/paintbrush-vertical.js
var PaintbrushVertical = [
  ["path", { d: "M10 2v2" }],
  ["path", { d: "M14 2v4" }],
  ["path", { d: "M17 2a1 1 0 0 1 1 1v9H6V3a1 1 0 0 1 1-1z" }],
  [
    "path",
    {
      d: "M6 12a1 1 0 0 0-1 1v1a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v2.9a2 2 0 1 0 4 0V17a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/paintbrush.js
var Paintbrush = [
  ["path", { d: "m14.622 17.897-10.68-2.913" }],
  [
    "path",
    {
      d: "M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"
    }
  ],
  [
    "path",
    {
      d: "M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/palette.js
var Palette = [
  [
    "path",
    {
      d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"
    }
  ],
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor" }]
];

// node_modules/lucide/dist/esm/icons/panda.js
var Panda = [
  ["path", { d: "M11.25 17.25h1.5L12 18z" }],
  ["path", { d: "m15 12 2 2" }],
  ["path", { d: "M18 6.5a.5.5 0 0 0-.5-.5" }],
  [
    "path",
    {
      d: "M20.69 9.67a4.5 4.5 0 1 0-7.04-5.5 8.35 8.35 0 0 0-3.3 0 4.5 4.5 0 1 0-7.04 5.5C2.49 11.2 2 12.88 2 14.5 2 19.47 6.48 22 12 22s10-2.53 10-7.5c0-1.62-.48-3.3-1.3-4.83"
    }
  ],
  ["path", { d: "M6 6.5a.495.495 0 0 1 .5-.5" }],
  ["path", { d: "m9 12-2 2" }]
];

// node_modules/lucide/dist/esm/icons/panel-bottom-close.js
var PanelBottomClose = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "m15 8-3 3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/panel-bottom-dashed.js
var PanelBottomDashed = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M14 15h1" }],
  ["path", { d: "M19 15h2" }],
  ["path", { d: "M3 15h2" }],
  ["path", { d: "M9 15h1" }]
];

// node_modules/lucide/dist/esm/icons/panel-bottom-open.js
var PanelBottomOpen = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "m9 10 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/panel-bottom.js
var PanelBottom = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 15h18" }]
];

// node_modules/lucide/dist/esm/icons/panel-left-close.js
var PanelLeftClose = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 3v18" }],
  ["path", { d: "m16 15-3-3 3-3" }]
];

// node_modules/lucide/dist/esm/icons/panel-left-dashed.js
var PanelLeftDashed = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 14v1" }],
  ["path", { d: "M9 19v2" }],
  ["path", { d: "M9 3v2" }],
  ["path", { d: "M9 9v1" }]
];

// node_modules/lucide/dist/esm/icons/panel-left-open.js
var PanelLeftOpen = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 3v18" }],
  ["path", { d: "m14 9 3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/panel-left-right-dashed.js
var PanelLeftRightDashed = [
  ["path", { d: "M15 10V9" }],
  ["path", { d: "M15 15v-1" }],
  ["path", { d: "M15 21v-2" }],
  ["path", { d: "M15 5V3" }],
  ["path", { d: "M9 10V9" }],
  ["path", { d: "M9 15v-1" }],
  ["path", { d: "M9 21v-2" }],
  ["path", { d: "M9 5V3" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/panel-left.js
var PanelLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 3v18" }]
];

// node_modules/lucide/dist/esm/icons/panel-right-close.js
var PanelRightClose = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M15 3v18" }],
  ["path", { d: "m8 9 3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/panel-right.js
var PanelRight = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M15 3v18" }]
];

// node_modules/lucide/dist/esm/icons/panel-right-open.js
var PanelRightOpen = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M15 3v18" }],
  ["path", { d: "m10 15-3-3 3-3" }]
];

// node_modules/lucide/dist/esm/icons/panel-right-dashed.js
var PanelRightDashed = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M15 14v1" }],
  ["path", { d: "M15 19v2" }],
  ["path", { d: "M15 3v2" }],
  ["path", { d: "M15 9v1" }]
];

// node_modules/lucide/dist/esm/icons/panel-top-bottom-dashed.js
var PanelTopBottomDashed = [
  ["path", { d: "M14 15h1" }],
  ["path", { d: "M14 9h1" }],
  ["path", { d: "M19 15h2" }],
  ["path", { d: "M19 9h2" }],
  ["path", { d: "M3 15h2" }],
  ["path", { d: "M3 9h2" }],
  ["path", { d: "M9 15h1" }],
  ["path", { d: "M9 9h1" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/panel-top-close.js
var PanelTopClose = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "m9 16 3-3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/panel-top-dashed.js
var PanelTopDashed = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M14 9h1" }],
  ["path", { d: "M19 9h2" }],
  ["path", { d: "M3 9h2" }],
  ["path", { d: "M9 9h1" }]
];

// node_modules/lucide/dist/esm/icons/panel-top-open.js
var PanelTopOpen = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "m15 14-3 3-3-3" }]
];

// node_modules/lucide/dist/esm/icons/panels-left-bottom.js
var PanelsLeftBottom = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 3v18" }],
  ["path", { d: "M9 15h12" }]
];

// node_modules/lucide/dist/esm/icons/panel-top.js
var PanelTop = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }]
];

// node_modules/lucide/dist/esm/icons/panels-right-bottom.js
var PanelsRightBottom = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 15h12" }],
  ["path", { d: "M15 3v18" }]
];

// node_modules/lucide/dist/esm/icons/panels-top-left.js
var PanelsTopLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "M9 21V9" }]
];

// node_modules/lucide/dist/esm/icons/paperclip.js
var Paperclip = [
  [
    "path",
    {
      d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/parking-meter.js
var ParkingMeter = [
  ["path", { d: "M11 15h2" }],
  ["path", { d: "M12 12v3" }],
  ["path", { d: "M12 19v3" }],
  [
    "path",
    {
      d: "M15.282 19a1 1 0 0 0 .948-.68l2.37-6.988a7 7 0 1 0-13.2 0l2.37 6.988a1 1 0 0 0 .948.68z"
    }
  ],
  ["path", { d: "M9 9a3 3 0 1 1 6 0" }]
];

// node_modules/lucide/dist/esm/icons/parentheses.js
var Parentheses = [
  ["path", { d: "M8 21s-4-3-4-9 4-9 4-9" }],
  ["path", { d: "M16 3s4 3 4 9-4 9-4 9" }]
];

// node_modules/lucide/dist/esm/icons/party-popper.js
var PartyPopper = [
  ["path", { d: "M5.8 11.3 2 22l10.7-3.79" }],
  ["path", { d: "M4 3h.01" }],
  ["path", { d: "M22 8h.01" }],
  ["path", { d: "M15 2h.01" }],
  ["path", { d: "M22 20h.01" }],
  [
    "path",
    {
      d: "m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"
    }
  ],
  ["path", { d: "m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" }],
  ["path", { d: "m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" }],
  [
    "path",
    {
      d: "M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pause.js
var Pause = [
  ["rect", { x: "14", y: "3", width: "5", height: "18", rx: "1" }],
  ["rect", { x: "5", y: "3", width: "5", height: "18", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/paw-print.js
var PawPrint = [
  ["circle", { cx: "11", cy: "4", r: "2" }],
  ["circle", { cx: "18", cy: "8", r: "2" }],
  ["circle", { cx: "20", cy: "16", r: "2" }],
  [
    "path",
    {
      d: "M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pc-case.js
var PcCase = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2" }],
  ["path", { d: "M15 14h.01" }],
  ["path", { d: "M9 6h6" }],
  ["path", { d: "M9 10h6" }]
];

// node_modules/lucide/dist/esm/icons/pen-line.js
var PenLine = [
  ["path", { d: "M13 21h8" }],
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pen-off.js
var PenOff = [
  [
    "path",
    {
      d: "m10 10-6.157 6.162a2 2 0 0 0-.5.833l-1.322 4.36a.5.5 0 0 0 .622.624l4.358-1.323a2 2 0 0 0 .83-.5L14 13.982"
    }
  ],
  ["path", { d: "m12.829 7.172 4.359-4.346a1 1 0 1 1 3.986 3.986l-4.353 4.353" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/pen-tool.js
var PenTool = [
  [
    "path",
    {
      d: "M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"
    }
  ],
  [
    "path",
    {
      d: "m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"
    }
  ],
  ["path", { d: "m2.3 2.3 7.286 7.286" }],
  ["circle", { cx: "11", cy: "11", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/pen.js
var Pen = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pencil-line.js
var PencilLine = [
  ["path", { d: "M13 21h8" }],
  ["path", { d: "m15 5 4 4" }],
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pencil-off.js
var PencilOff = [
  [
    "path",
    {
      d: "m10 10-6.157 6.162a2 2 0 0 0-.5.833l-1.322 4.36a.5.5 0 0 0 .622.624l4.358-1.323a2 2 0 0 0 .83-.5L14 13.982"
    }
  ],
  ["path", { d: "m12.829 7.172 4.359-4.346a1 1 0 1 1 3.986 3.986l-4.353 4.353" }],
  ["path", { d: "m15 5 4 4" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/pencil-ruler.js
var PencilRuler = [
  ["path", { d: "M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" }],
  ["path", { d: "m8 6 2-2" }],
  ["path", { d: "m18 16 2-2" }],
  ["path", { d: "m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17" }],
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
    }
  ],
  ["path", { d: "m15 5 4 4" }]
];

// node_modules/lucide/dist/esm/icons/pencil.js
var Pencil = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
    }
  ],
  ["path", { d: "m15 5 4 4" }]
];

// node_modules/lucide/dist/esm/icons/pentagon.js
var Pentagon = [
  [
    "path",
    {
      d: "M10.83 2.38a2 2 0 0 1 2.34 0l8 5.74a2 2 0 0 1 .73 2.25l-3.04 9.26a2 2 0 0 1-1.9 1.37H7.04a2 2 0 0 1-1.9-1.37L2.1 10.37a2 2 0 0 1 .73-2.25z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/percent.js
var Percent = [
  ["line", { x1: "19", x2: "5", y1: "5", y2: "19" }],
  ["circle", { cx: "6.5", cy: "6.5", r: "2.5" }],
  ["circle", { cx: "17.5", cy: "17.5", r: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/person-standing.js
var PersonStanding = [
  ["circle", { cx: "12", cy: "5", r: "1" }],
  ["path", { d: "m9 20 3-6 3 6" }],
  ["path", { d: "m6 8 6 2 6-2" }],
  ["path", { d: "M12 10v4" }]
];

// node_modules/lucide/dist/esm/icons/philippine-peso.js
var PhilippinePeso = [
  ["path", { d: "M20 11H4" }],
  ["path", { d: "M20 7H4" }],
  ["path", { d: "M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7" }]
];

// node_modules/lucide/dist/esm/icons/phone-call.js
var PhoneCall = [
  ["path", { d: "M13 2a9 9 0 0 1 9 9" }],
  ["path", { d: "M13 6a5 5 0 0 1 5 5" }],
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone-forwarded.js
var PhoneForwarded = [
  ["path", { d: "M14 6h8" }],
  ["path", { d: "m18 2 4 4-4 4" }],
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone-incoming.js
var PhoneIncoming = [
  ["path", { d: "M16 2v6h6" }],
  ["path", { d: "m22 2-6 6" }],
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone-missed.js
var PhoneMissed = [
  ["path", { d: "m16 2 6 6" }],
  ["path", { d: "m22 2-6 6" }],
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone-off.js
var PhoneOff = [
  [
    "path",
    {
      d: "M10.1 13.9a14 14 0 0 0 3.732 2.668 1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2 18 18 0 0 1-12.728-5.272"
    }
  ],
  ["path", { d: "M22 2 2 22" }],
  [
    "path",
    {
      d: "M4.76 13.582A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 .244.473"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone-outgoing.js
var PhoneOutgoing = [
  ["path", { d: "m16 8 6-6" }],
  ["path", { d: "M22 8V2h-6" }],
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/phone.js
var Phone = [
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pi.js
var Pi = [
  ["line", { x1: "9", x2: "9", y1: "4", y2: "20" }],
  ["path", { d: "M4 7c0-1.7 1.3-3 3-3h13" }],
  ["path", { d: "M18 20c-1.7 0-3-1.3-3-3V4" }]
];

// node_modules/lucide/dist/esm/icons/piano.js
var Piano = [
  [
    "path",
    {
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8"
    }
  ],
  ["path", { d: "M2 14h20" }],
  ["path", { d: "M6 14v4" }],
  ["path", { d: "M10 14v4" }],
  ["path", { d: "M14 14v4" }],
  ["path", { d: "M18 14v4" }]
];

// node_modules/lucide/dist/esm/icons/pickaxe.js
var Pickaxe = [
  ["path", { d: "m14 13-8.381 8.38a1 1 0 0 1-3.001-3L11 9.999" }],
  [
    "path",
    {
      d: "M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024"
    }
  ],
  [
    "path",
    {
      d: "M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069"
    }
  ],
  [
    "path",
    {
      d: "M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/picture-in-picture-2.js
var PictureInPicture2 = [
  ["path", { d: "M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4" }],
  ["rect", { width: "10", height: "7", x: "12", y: "13", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/picture-in-picture.js
var PictureInPicture = [
  ["path", { d: "M2 10h6V4" }],
  ["path", { d: "m2 4 6 6" }],
  ["path", { d: "M21 10V7a2 2 0 0 0-2-2h-7" }],
  ["path", { d: "M3 14v2a2 2 0 0 0 2 2h3" }],
  ["rect", { x: "12", y: "14", width: "10", height: "7", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/pilcrow-left.js
var PilcrowLeft = [
  ["path", { d: "M14 3v11" }],
  ["path", { d: "M14 9h-3a3 3 0 0 1 0-6h9" }],
  ["path", { d: "M18 3v11" }],
  ["path", { d: "M22 18H2l4-4" }],
  ["path", { d: "m6 22-4-4" }]
];

// node_modules/lucide/dist/esm/icons/piggy-bank.js
var PiggyBank = [
  [
    "path",
    {
      d: "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"
    }
  ],
  ["path", { d: "M16 10h.01" }],
  ["path", { d: "M2 8v1a2 2 0 0 0 2 2h1" }]
];

// node_modules/lucide/dist/esm/icons/pilcrow-right.js
var PilcrowRight = [
  ["path", { d: "M10 3v11" }],
  ["path", { d: "M10 9H7a1 1 0 0 1 0-6h8" }],
  ["path", { d: "M14 3v11" }],
  ["path", { d: "m18 14 4 4H2" }],
  ["path", { d: "m22 18-4 4" }]
];

// node_modules/lucide/dist/esm/icons/pilcrow.js
var Pilcrow = [
  ["path", { d: "M13 4v16" }],
  ["path", { d: "M17 4v16" }],
  ["path", { d: "M19 4H9.5a4.5 4.5 0 0 0 0 9H13" }]
];

// node_modules/lucide/dist/esm/icons/pill-bottle.js
var PillBottle = [
  ["path", { d: "M18 11h-4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h4" }],
  ["path", { d: "M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" }],
  ["rect", { width: "16", height: "5", x: "4", y: "2", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/pill.js
var Pill = [
  ["path", { d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" }],
  ["path", { d: "m8.5 8.5 7 7" }]
];

// node_modules/lucide/dist/esm/icons/pin.js
var Pin = [
  ["path", { d: "M12 17v5" }],
  [
    "path",
    {
      d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/pipette.js
var Pipette = [
  [
    "path",
    {
      d: "m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12"
    }
  ],
  ["path", { d: "m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z" }],
  ["path", { d: "m2 22 .414-.414" }]
];

// node_modules/lucide/dist/esm/icons/pin-off.js
var PinOff = [
  ["path", { d: "M12 17v5" }],
  ["path", { d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" }]
];

// node_modules/lucide/dist/esm/icons/pizza.js
var Pizza = [
  ["path", { d: "m12 14-1 1" }],
  ["path", { d: "m13.75 18.25-1.25 1.42" }],
  ["path", { d: "M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12" }],
  ["path", { d: "M18.8 9.3a1 1 0 0 0 2.1 7.7" }],
  [
    "path",
    {
      d: "M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/plane-landing.js
var PlaneLanding = [
  ["path", { d: "M2 22h20" }],
  [
    "path",
    {
      d: "M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/plane-takeoff.js
var PlaneTakeoff = [
  ["path", { d: "M2 22h20" }],
  [
    "path",
    {
      d: "M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/plane.js
var Plane = [
  [
    "path",
    {
      d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/play.js
var Play = [
  [
    "path",
    { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }
  ]
];

// node_modules/lucide/dist/esm/icons/plug-2.js
var Plug2 = [
  ["path", { d: "M9 2v6" }],
  ["path", { d: "M15 2v6" }],
  ["path", { d: "M12 17v5" }],
  ["path", { d: "M5 8h14" }],
  ["path", { d: "M6 11V8h12v3a6 6 0 1 1-12 0Z" }]
];

// node_modules/lucide/dist/esm/icons/plug-zap.js
var PlugZap = [
  ["path", { d: "M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" }],
  ["path", { d: "m2 22 3-3" }],
  ["path", { d: "M7.5 13.5 10 11" }],
  ["path", { d: "M10.5 16.5 13 14" }],
  ["path", { d: "m18 3-4 4h6l-4 4" }]
];

// node_modules/lucide/dist/esm/icons/plug.js
var Plug = [
  ["path", { d: "M12 22v-5" }],
  ["path", { d: "M9 8V2" }],
  ["path", { d: "M15 8V2" }],
  ["path", { d: "M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" }]
];

// node_modules/lucide/dist/esm/icons/plus.js
var Plus = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }]
];

// node_modules/lucide/dist/esm/icons/pocket-knife.js
var PocketKnife = [
  ["path", { d: "M3 2v1c0 1 2 1 2 2S3 6 3 7s2 1 2 2-2 1-2 2 2 1 2 2" }],
  ["path", { d: "M18 6h.01" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "M20.83 8.83a4 4 0 0 0-5.66-5.66l-12 12a4 4 0 1 0 5.66 5.66Z" }],
  ["path", { d: "M18 11.66V22a4 4 0 0 0 4-4V6" }]
];

// node_modules/lucide/dist/esm/icons/pocket.js
var Pocket = [
  ["path", { d: "M20 3a2 2 0 0 1 2 2v6a1 1 0 0 1-20 0V5a2 2 0 0 1 2-2z" }],
  ["path", { d: "m8 10 4 4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/podcast.js
var Podcast = [
  ["path", { d: "M13 17a1 1 0 1 0-2 0l.5 4.5a0.5 0.5 0 0 0 1 0z", fill: "currentColor" }],
  ["path", { d: "M16.85 18.58a9 9 0 1 0-9.7 0" }],
  ["path", { d: "M8 14a5 5 0 1 1 8 0" }],
  ["circle", { cx: "12", cy: "11", r: "1", fill: "currentColor" }]
];

// node_modules/lucide/dist/esm/icons/pointer-off.js
var PointerOff = [
  ["path", { d: "M10 4.5V4a2 2 0 0 0-2.41-1.957" }],
  ["path", { d: "M13.9 8.4a2 2 0 0 0-1.26-1.295" }],
  ["path", { d: "M21.7 16.2A8 8 0 0 0 22 14v-3a2 2 0 1 0-4 0v-1a2 2 0 0 0-3.63-1.158" }],
  [
    "path",
    { d: "m7 15-1.8-1.8a2 2 0 0 0-2.79 2.86L6 19.7a7.74 7.74 0 0 0 6 2.3h2a8 8 0 0 0 5.657-2.343" }
  ],
  ["path", { d: "M6 6v8" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/pointer.js
var Pointer2 = [
  ["path", { d: "M22 14a8 8 0 0 1-8 8" }],
  ["path", { d: "M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }],
  ["path", { d: "M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" }],
  ["path", { d: "M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" }],
  [
    "path",
    {
      d: "M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/popcorn.js
var Popcorn = [
  ["path", { d: "M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4" }],
  ["path", { d: "M10 22 9 8" }],
  ["path", { d: "m14 22 1-14" }],
  [
    "path",
    {
      d: "M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/popsicle.js
var Popsicle = [
  [
    "path",
    { d: "M18.6 14.4c.8-.8.8-2 0-2.8l-8.1-8.1a4.95 4.95 0 1 0-7.1 7.1l8.1 8.1c.9.7 2.1.7 2.9-.1Z" }
  ],
  ["path", { d: "m22 22-5.5-5.5" }]
];

// node_modules/lucide/dist/esm/icons/pound-sterling.js
var PoundSterling = [
  ["path", { d: "M18 7c0-5.333-8-5.333-8 0" }],
  ["path", { d: "M10 7v14" }],
  ["path", { d: "M6 21h12" }],
  ["path", { d: "M6 13h10" }]
];

// node_modules/lucide/dist/esm/icons/power-off.js
var PowerOff = [
  ["path", { d: "M18.36 6.64A9 9 0 0 1 20.77 15" }],
  ["path", { d: "M6.16 6.16a9 9 0 1 0 12.68 12.68" }],
  ["path", { d: "M12 2v4" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/power.js
var Power = [
  ["path", { d: "M12 2v10" }],
  ["path", { d: "M18.4 6.6a9 9 0 1 1-12.77.04" }]
];

// node_modules/lucide/dist/esm/icons/presentation.js
var Presentation = [
  ["path", { d: "M2 3h20" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" }],
  ["path", { d: "m7 21 5-5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/printer-check.js
var PrinterCheck = [
  ["path", { d: "M13.5 22H7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v.5" }],
  ["path", { d: "m16 19 2 2 4-4" }],
  ["path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }]
];

// node_modules/lucide/dist/esm/icons/printer.js
var Printer = [
  ["path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" }],
  ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/projector.js
var Projector = [
  ["path", { d: "M5 7 3 5" }],
  ["path", { d: "M9 6V3" }],
  ["path", { d: "m13 7 2-2" }],
  ["circle", { cx: "9", cy: "13", r: "3" }],
  [
    "path",
    { d: "M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17" }
  ],
  ["path", { d: "M16 16h2" }]
];

// node_modules/lucide/dist/esm/icons/proportions.js
var Proportions = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M12 9v11" }],
  ["path", { d: "M2 9h13a2 2 0 0 1 2 2v9" }]
];

// node_modules/lucide/dist/esm/icons/puzzle.js
var Puzzle = [
  [
    "path",
    {
      d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/qr-code.js
var QrCode = [
  ["rect", { width: "5", height: "5", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "5", height: "5", x: "16", y: "3", rx: "1" }],
  ["rect", { width: "5", height: "5", x: "3", y: "16", rx: "1" }],
  ["path", { d: "M21 16h-3a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 21v.01" }],
  ["path", { d: "M12 7v3a2 2 0 0 1-2 2H7" }],
  ["path", { d: "M3 12h.01" }],
  ["path", { d: "M12 3h.01" }],
  ["path", { d: "M12 16v.01" }],
  ["path", { d: "M16 12h1" }],
  ["path", { d: "M21 12v.01" }],
  ["path", { d: "M12 21v-1" }]
];

// node_modules/lucide/dist/esm/icons/pyramid.js
var Pyramid = [
  [
    "path",
    {
      d: "M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"
    }
  ],
  ["path", { d: "M12 2v20" }]
];

// node_modules/lucide/dist/esm/icons/quote.js
var Quote = [
  [
    "path",
    {
      d: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"
    }
  ],
  [
    "path",
    {
      d: "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/rabbit.js
var Rabbit = [
  ["path", { d: "M13 16a3 3 0 0 1 2.24 5" }],
  ["path", { d: "M18 12h.01" }],
  [
    "path",
    {
      d: "M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"
    }
  ],
  ["path", { d: "M20 8.54V4a2 2 0 1 0-4 0v3" }],
  ["path", { d: "M7.612 12.524a3 3 0 1 0-1.6 4.3" }]
];

// node_modules/lucide/dist/esm/icons/radar.js
var Radar = [
  ["path", { d: "M19.07 4.93A10 10 0 0 0 6.99 3.34" }],
  ["path", { d: "M4 6h.01" }],
  ["path", { d: "M2.29 9.62A10 10 0 1 0 21.31 8.35" }],
  ["path", { d: "M16.24 7.76A6 6 0 1 0 8.23 16.67" }],
  ["path", { d: "M12 18h.01" }],
  ["path", { d: "M17.99 11.66A6 6 0 0 1 15.77 16.67" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "m13.41 10.59 5.66-5.66" }]
];

// node_modules/lucide/dist/esm/icons/radiation.js
var Radiation = [
  ["path", { d: "M12 12h.01" }],
  [
    "path",
    {
      d: "M14 15.4641a4 4 0 0 1-4 0L7.52786 19.74597 A 1 1 0 0 0 7.99303 21.16211 10 10 0 0 0 16.00697 21.16211 1 1 0 0 0 16.47214 19.74597z"
    }
  ],
  [
    "path",
    {
      d: "M16 12a4 4 0 0 0-2-3.464l2.472-4.282a1 1 0 0 1 1.46-.305 10 10 0 0 1 4.006 6.94A1 1 0 0 1 21 12z"
    }
  ],
  [
    "path",
    {
      d: "M8 12a4 4 0 0 1 2-3.464L7.528 4.254a1 1 0 0 0-1.46-.305 10 10 0 0 0-4.006 6.94A1 1 0 0 0 3 12z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/radical.js
var Radical = [
  [
    "path",
    {
      d: "M3 12h3.28a1 1 0 0 1 .948.684l2.298 7.934a.5.5 0 0 0 .96-.044L13.82 4.771A1 1 0 0 1 14.792 4H21"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/radio-receiver.js
var RadioReceiver = [
  ["path", { d: "M5 16v2" }],
  ["path", { d: "M19 16v2" }],
  ["rect", { width: "20", height: "8", x: "2", y: "8", rx: "2" }],
  ["path", { d: "M18 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/radio-tower.js
var RadioTower = [
  ["path", { d: "M4.9 16.1C1 12.2 1 5.8 4.9 1.9" }],
  ["path", { d: "M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" }],
  ["circle", { cx: "12", cy: "9", r: "2" }],
  ["path", { d: "M16.2 4.8c2 2 2.26 5.11.8 7.47" }],
  ["path", { d: "M19.1 1.9a9.96 9.96 0 0 1 0 14.1" }],
  ["path", { d: "M9.5 18h5" }],
  ["path", { d: "m8 22 4-11 4 11" }]
];

// node_modules/lucide/dist/esm/icons/radio.js
var Radio = [
  ["path", { d: "M16.247 7.761a6 6 0 0 1 0 8.478" }],
  ["path", { d: "M19.075 4.933a10 10 0 0 1 0 14.134" }],
  ["path", { d: "M4.925 19.067a10 10 0 0 1 0-14.134" }],
  ["path", { d: "M7.753 16.239a6 6 0 0 1 0-8.478" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/radius.js
var Radius = [
  ["path", { d: "M20.34 17.52a10 10 0 1 0-2.82 2.82" }],
  ["circle", { cx: "19", cy: "19", r: "2" }],
  ["path", { d: "m13.41 13.41 4.18 4.18" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/rail-symbol.js
var RailSymbol = [
  ["path", { d: "M5 15h14" }],
  ["path", { d: "M5 9h14" }],
  ["path", { d: "m14 20-5-5 6-6-5-5" }]
];

// node_modules/lucide/dist/esm/icons/rat.js
var Rat = [
  ["path", { d: "M13 22H4a2 2 0 0 1 0-4h12" }],
  ["path", { d: "M13.236 18a3 3 0 0 0-2.2-5" }],
  ["path", { d: "M16 9h.01" }],
  [
    "path",
    {
      d: "M16.82 3.94a3 3 0 1 1 3.237 4.868l1.815 2.587a1.5 1.5 0 0 1-1.5 2.1l-2.872-.453a3 3 0 0 0-3.5 3"
    }
  ],
  ["path", { d: "M17 4.988a3 3 0 1 0-5.2 2.052A7 7 0 0 0 4 14.015 4 4 0 0 0 8 18" }]
];

// node_modules/lucide/dist/esm/icons/rainbow.js
var Rainbow = [
  ["path", { d: "M22 17a10 10 0 0 0-20 0" }],
  ["path", { d: "M6 17a6 6 0 0 1 12 0" }],
  ["path", { d: "M10 17a2 2 0 0 1 4 0" }]
];

// node_modules/lucide/dist/esm/icons/ratio.js
var Ratio = [
  ["rect", { width: "12", height: "20", x: "6", y: "2", rx: "2" }],
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/receipt-cent.js
var ReceiptCent = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M12 6.5v11" }],
  ["path", { d: "M15 9.4a4 4 0 1 0 0 5.2" }]
];

// node_modules/lucide/dist/esm/icons/receipt-euro.js
var ReceiptEuro = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M8 12h5" }],
  ["path", { d: "M16 9.5a4 4 0 1 0 0 5.2" }]
];

// node_modules/lucide/dist/esm/icons/receipt-indian-rupee.js
var ReceiptIndianRupee = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M8 7h8" }],
  ["path", { d: "M12 17.5 8 15h1a4 4 0 0 0 0-8" }],
  ["path", { d: "M8 11h8" }]
];

// node_modules/lucide/dist/esm/icons/receipt-japanese-yen.js
var ReceiptJapaneseYen = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "m12 10 3-3" }],
  ["path", { d: "m9 7 3 3v7.5" }],
  ["path", { d: "M9 11h6" }],
  ["path", { d: "M9 15h6" }]
];

// node_modules/lucide/dist/esm/icons/receipt-pound-sterling.js
var ReceiptPoundSterling = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M8 13h5" }],
  ["path", { d: "M10 17V9.5a2.5 2.5 0 0 1 5 0" }],
  ["path", { d: "M8 17h7" }]
];

// node_modules/lucide/dist/esm/icons/receipt-russian-ruble.js
var ReceiptRussianRuble = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M8 15h5" }],
  ["path", { d: "M8 11h5a2 2 0 1 0 0-4h-3v10" }]
];

// node_modules/lucide/dist/esm/icons/receipt-swiss-franc.js
var ReceiptSwissFranc = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M10 17V7h5" }],
  ["path", { d: "M10 11h4" }],
  ["path", { d: "M8 15h5" }]
];

// node_modules/lucide/dist/esm/icons/receipt-text.js
var ReceiptText = [
  ["path", { d: "M13 16H8" }],
  ["path", { d: "M14 8H8" }],
  ["path", { d: "M16 12H8" }],
  [
    "path",
    {
      d: "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/receipt.js
var Receipt = [
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }],
  ["path", { d: "M12 17.5v-11" }]
];

// node_modules/lucide/dist/esm/icons/receipt-turkish-lira.js
var ReceiptTurkishLira = [
  ["path", { d: "M10 6.5v11a5.5 5.5 0 0 0 5.5-5.5" }],
  ["path", { d: "m14 8-6 3" }],
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" }]
];

// node_modules/lucide/dist/esm/icons/rectangle-circle.js
var RectangleCircle = [
  ["path", { d: "M14 4v16H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" }],
  ["circle", { cx: "14", cy: "12", r: "8" }]
];

// node_modules/lucide/dist/esm/icons/rectangle-ellipsis.js
var RectangleEllipsis = [
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M17 12h.01" }],
  ["path", { d: "M7 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/rectangle-goggles.js
var RectangleGoggles = [
  [
    "path",
    {
      d: "M20 6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-1.6-.8l-1.6-2.13a1 1 0 0 0-1.6 0L9.6 17.2A2 2 0 0 1 8 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/rectangle-horizontal.js
var RectangleHorizontal = [
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/rectangle-vertical.js
var RectangleVertical = [
  ["rect", { width: "12", height: "20", x: "6", y: "2", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/recycle.js
var Recycle = [
  ["path", { d: "M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" }],
  ["path", { d: "M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" }],
  ["path", { d: "m14 16-3 3 3 3" }],
  ["path", { d: "M8.293 13.596 7.196 9.5 3.1 10.598" }],
  [
    "path",
    {
      d: "m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"
    }
  ],
  ["path", { d: "m13.378 9.633 4.096 1.098 1.097-4.096" }]
];

// node_modules/lucide/dist/esm/icons/redo-2.js
var Redo2 = [
  ["path", { d: "m15 14 5-5-5-5" }],
  ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]
];

// node_modules/lucide/dist/esm/icons/redo-dot.js
var RedoDot = [
  ["circle", { cx: "12", cy: "17", r: "1" }],
  ["path", { d: "M21 7v6h-6" }],
  ["path", { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" }]
];

// node_modules/lucide/dist/esm/icons/redo.js
var Redo = [
  ["path", { d: "M21 7v6h-6" }],
  ["path", { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" }]
];

// node_modules/lucide/dist/esm/icons/refresh-ccw-dot.js
var RefreshCcwDot = [
  ["path", { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }],
  ["path", { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" }],
  ["path", { d: "M16 16h5v5" }],
  ["circle", { cx: "12", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/refresh-ccw.js
var RefreshCcw = [
  ["path", { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }],
  ["path", { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" }],
  ["path", { d: "M16 16h5v5" }]
];

// node_modules/lucide/dist/esm/icons/refresh-cw-off.js
var RefreshCwOff = [
  ["path", { d: "M21 8L18.74 5.74A9.75 9.75 0 0 0 12 3C11 3 10.03 3.16 9.13 3.47" }],
  ["path", { d: "M8 16H3v5" }],
  ["path", { d: "M3 12C3 9.51 4 7.26 5.64 5.64" }],
  ["path", { d: "m3 16 2.26 2.26A9.75 9.75 0 0 0 12 21c2.49 0 4.74-1 6.36-2.64" }],
  ["path", { d: "M21 12c0 1-.16 1.97-.47 2.87" }],
  ["path", { d: "M21 3v5h-5" }],
  ["path", { d: "M22 22 2 2" }]
];

// node_modules/lucide/dist/esm/icons/refresh-cw.js
var RefreshCw = [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
  ["path", { d: "M21 3v5h-5" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
  ["path", { d: "M8 16H3v5" }]
];

// node_modules/lucide/dist/esm/icons/refrigerator.js
var Refrigerator = [
  ["path", { d: "M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z" }],
  ["path", { d: "M5 10h14" }],
  ["path", { d: "M15 7v6" }]
];

// node_modules/lucide/dist/esm/icons/regex.js
var Regex = [
  ["path", { d: "M17 3v10" }],
  ["path", { d: "m12.67 5.5 8.66 5" }],
  ["path", { d: "m12.67 10.5 8.66-5" }],
  ["path", { d: "M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z" }]
];

// node_modules/lucide/dist/esm/icons/remove-formatting.js
var RemoveFormatting = [
  ["path", { d: "M4 7V4h16v3" }],
  ["path", { d: "M5 20h6" }],
  ["path", { d: "M13 4 8 20" }],
  ["path", { d: "m15 15 5 5" }],
  ["path", { d: "m20 15-5 5" }]
];

// node_modules/lucide/dist/esm/icons/repeat-1.js
var Repeat1 = [
  ["path", { d: "m17 2 4 4-4 4" }],
  ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14" }],
  ["path", { d: "m7 22-4-4 4-4" }],
  ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3" }],
  ["path", { d: "M11 10h1v4" }]
];

// node_modules/lucide/dist/esm/icons/repeat-2.js
var Repeat2 = [
  ["path", { d: "m2 9 3-3 3 3" }],
  ["path", { d: "M13 18H7a2 2 0 0 1-2-2V6" }],
  ["path", { d: "m22 15-3 3-3-3" }],
  ["path", { d: "M11 6h6a2 2 0 0 1 2 2v10" }]
];

// node_modules/lucide/dist/esm/icons/repeat.js
var Repeat = [
  ["path", { d: "m17 2 4 4-4 4" }],
  ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14" }],
  ["path", { d: "m7 22-4-4 4-4" }],
  ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3" }]
];

// node_modules/lucide/dist/esm/icons/replace-all.js
var ReplaceAll = [
  ["path", { d: "M14 14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1" }],
  ["path", { d: "M14 4a1 1 0 0 1 1-1" }],
  ["path", { d: "M15 10a1 1 0 0 1-1-1" }],
  ["path", { d: "M19 14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1" }],
  ["path", { d: "M21 4a1 1 0 0 0-1-1" }],
  ["path", { d: "M21 9a1 1 0 0 1-1 1" }],
  ["path", { d: "m3 7 3 3 3-3" }],
  ["path", { d: "M6 10V5a2 2 0 0 1 2-2h2" }],
  ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/replace.js
var Replace = [
  ["path", { d: "M14 4a1 1 0 0 1 1-1" }],
  ["path", { d: "M15 10a1 1 0 0 1-1-1" }],
  ["path", { d: "M21 4a1 1 0 0 0-1-1" }],
  ["path", { d: "M21 9a1 1 0 0 1-1 1" }],
  ["path", { d: "m3 7 3 3 3-3" }],
  ["path", { d: "M6 10V5a2 2 0 0 1 2-2h2" }],
  ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/reply-all.js
var ReplyAll = [
  ["path", { d: "m12 17-5-5 5-5" }],
  ["path", { d: "M22 18v-2a4 4 0 0 0-4-4H7" }],
  ["path", { d: "m7 17-5-5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/reply.js
var Reply = [
  ["path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" }],
  ["path", { d: "m9 17-5-5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/rewind.js
var Rewind = [
  ["path", { d: "M12 6a2 2 0 0 0-3.414-1.414l-6 6a2 2 0 0 0 0 2.828l6 6A2 2 0 0 0 12 18z" }],
  ["path", { d: "M22 6a2 2 0 0 0-3.414-1.414l-6 6a2 2 0 0 0 0 2.828l6 6A2 2 0 0 0 22 18z" }]
];

// node_modules/lucide/dist/esm/icons/ribbon.js
var Ribbon = [
  ["path", { d: "M12 11.22C11 9.997 10 9 10 8a2 2 0 0 1 4 0c0 1-.998 2.002-2.01 3.22" }],
  ["path", { d: "m12 18 2.57-3.5" }],
  ["path", { d: "M6.243 9.016a7 7 0 0 1 11.507-.009" }],
  ["path", { d: "M9.35 14.53 12 11.22" }],
  [
    "path",
    {
      d: "M9.35 14.53C7.728 12.246 6 10.221 6 7a6 5 0 0 1 12 0c-.005 3.22-1.778 5.235-3.43 7.5l3.557 4.527a1 1 0 0 1-.203 1.43l-1.894 1.36a1 1 0 0 1-1.384-.215L12 18l-2.679 3.593a1 1 0 0 1-1.39.213l-1.865-1.353a1 1 0 0 1-.203-1.422z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/rocket.js
var Rocket = [
  [
    "path",
    {
      d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
    }
  ],
  [
    "path",
    {
      d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
    }
  ],
  ["path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }],
  ["path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }]
];

// node_modules/lucide/dist/esm/icons/rocking-chair.js
var RockingChair = [
  ["polyline", { points: "3.5 2 6.5 12.5 18 12.5" }],
  ["line", { x1: "9.5", x2: "5.5", y1: "12.5", y2: "20" }],
  ["line", { x1: "15", x2: "18.5", y1: "12.5", y2: "20" }],
  ["path", { d: "M2.75 18a13 13 0 0 0 18.5 0" }]
];

// node_modules/lucide/dist/esm/icons/roller-coaster.js
var RollerCoaster = [
  ["path", { d: "M6 19V5" }],
  ["path", { d: "M10 19V6.8" }],
  ["path", { d: "M14 19v-7.8" }],
  ["path", { d: "M18 5v4" }],
  ["path", { d: "M18 19v-6" }],
  ["path", { d: "M22 19V9" }],
  ["path", { d: "M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65" }]
];

// node_modules/lucide/dist/esm/icons/rose.js
var Rose = [
  ["path", { d: "M17 10h-1a4 4 0 1 1 4-4v.534" }],
  ["path", { d: "M17 6h1a4 4 0 0 1 1.42 7.74l-2.29.87a6 6 0 0 1-5.339-10.68l2.069-1.31" }],
  [
    "path",
    { d: "M4.5 17c2.8-.5 4.4 0 5.5.8s1.8 2.2 2.3 3.7c-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2" }
  ],
  ["path", { d: "M9.77 12C4 15 2 22 2 22" }],
  ["circle", { cx: "17", cy: "8", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/rotate-3d.js
var Rotate3d = [
  [
    "path",
    {
      d: "M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2"
    }
  ],
  ["path", { d: "m15.194 13.707 3.814 1.86-1.86 3.814" }],
  [
    "path",
    {
      d: "M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/rotate-ccw-key.js
var RotateCcwKey = [
  ["path", { d: "m14.5 9.5 1 1" }],
  ["path", { d: "m15.5 8.5-4 4" }],
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }],
  ["circle", { cx: "10", cy: "14", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/rotate-ccw-square.js
var RotateCcwSquare = [
  ["path", { d: "M20 9V7a2 2 0 0 0-2-2h-6" }],
  ["path", { d: "m15 2-3 3 3 3" }],
  ["path", { d: "M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" }]
];

// node_modules/lucide/dist/esm/icons/rotate-ccw.js
var RotateCcw = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }]
];

// node_modules/lucide/dist/esm/icons/rotate-cw-square.js
var RotateCwSquare = [
  ["path", { d: "M12 5H6a2 2 0 0 0-2 2v3" }],
  ["path", { d: "m9 8 3-3-3-3" }],
  ["path", { d: "M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" }]
];

// node_modules/lucide/dist/esm/icons/rotate-cw.js
var RotateCw = [
  ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }],
  ["path", { d: "M21 3v5h-5" }]
];

// node_modules/lucide/dist/esm/icons/route-off.js
var RouteOff = [
  ["circle", { cx: "6", cy: "19", r: "3" }],
  ["path", { d: "M9 19h8.5c.4 0 .9-.1 1.3-.2" }],
  ["path", { d: "M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M21 15.3a3.5 3.5 0 0 0-3.3-3.3" }],
  ["path", { d: "M15 5h-4.3" }],
  ["circle", { cx: "18", cy: "5", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/route.js
var Route = [
  ["circle", { cx: "6", cy: "19", r: "3" }],
  ["path", { d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" }],
  ["circle", { cx: "18", cy: "5", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/router.js
var Router = [
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2" }],
  ["path", { d: "M6.01 18H6" }],
  ["path", { d: "M10.01 18H10" }],
  ["path", { d: "M15 10v4" }],
  ["path", { d: "M17.84 7.17a4 4 0 0 0-5.66 0" }],
  ["path", { d: "M20.66 4.34a8 8 0 0 0-11.31 0" }]
];

// node_modules/lucide/dist/esm/icons/rows-2.js
var Rows2 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 12h18" }]
];

// node_modules/lucide/dist/esm/icons/rows-3.js
var Rows3 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M21 9H3" }],
  ["path", { d: "M21 15H3" }]
];

// node_modules/lucide/dist/esm/icons/rss.js
var Rss = [
  ["path", { d: "M4 11a9 9 0 0 1 9 9" }],
  ["path", { d: "M4 4a16 16 0 0 1 16 16" }],
  ["circle", { cx: "5", cy: "19", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/rows-4.js
var Rows4 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M21 7.5H3" }],
  ["path", { d: "M21 12H3" }],
  ["path", { d: "M21 16.5H3" }]
];

// node_modules/lucide/dist/esm/icons/ruler-dimension-line.js
var RulerDimensionLine = [
  ["path", { d: "M12 15v-3.014" }],
  ["path", { d: "M16 15v-3.014" }],
  ["path", { d: "M20 6H4" }],
  ["path", { d: "M20 8V4" }],
  ["path", { d: "M4 8V4" }],
  ["path", { d: "M8 15v-3.014" }],
  ["rect", { x: "3", y: "12", width: "18", height: "7", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/ruler.js
var Ruler = [
  [
    "path",
    {
      d: "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
    }
  ],
  ["path", { d: "m14.5 12.5 2-2" }],
  ["path", { d: "m11.5 9.5 2-2" }],
  ["path", { d: "m8.5 6.5 2-2" }],
  ["path", { d: "m17.5 15.5 2-2" }]
];

// node_modules/lucide/dist/esm/icons/russian-ruble.js
var RussianRuble = [
  ["path", { d: "M6 11h8a4 4 0 0 0 0-8H9v18" }],
  ["path", { d: "M6 15h8" }]
];

// node_modules/lucide/dist/esm/icons/sailboat.js
var Sailboat = [
  ["path", { d: "M10 2v15" }],
  ["path", { d: "M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z" }],
  [
    "path",
    { d: "M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z" }
  ]
];

// node_modules/lucide/dist/esm/icons/salad.js
var Salad = [
  ["path", { d: "M7 21h10" }],
  ["path", { d: "M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" }],
  [
    "path",
    {
      d: "M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"
    }
  ],
  ["path", { d: "m13 12 4-4" }],
  ["path", { d: "M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2" }]
];

// node_modules/lucide/dist/esm/icons/sandwich.js
var Sandwich = [
  ["path", { d: "m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777" }],
  ["path", { d: "M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25" }],
  ["path", { d: "M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9" }],
  ["path", { d: "m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2" }],
  ["rect", { width: "20", height: "4", x: "2", y: "11", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/satellite-dish.js
var SatelliteDish = [
  ["path", { d: "M4 10a7.31 7.31 0 0 0 10 10Z" }],
  ["path", { d: "m9 15 3-3" }],
  ["path", { d: "M17 13a6 6 0 0 0-6-6" }],
  ["path", { d: "M21 13A10 10 0 0 0 11 3" }]
];

// node_modules/lucide/dist/esm/icons/satellite.js
var Satellite = [
  [
    "path",
    {
      d: "m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"
    }
  ],
  ["path", { d: "M16.5 7.5 19 5" }],
  [
    "path",
    {
      d: "m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"
    }
  ],
  ["path", { d: "M9 21a6 6 0 0 0-6-6" }],
  [
    "path",
    {
      d: "M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/saudi-riyal.js
var SaudiRiyal = [
  ["path", { d: "m20 19.5-5.5 1.2" }],
  ["path", { d: "M14.5 4v11.22a1 1 0 0 0 1.242.97L20 15.2" }],
  ["path", { d: "m2.978 19.351 5.549-1.363A2 2 0 0 0 10 16V2" }],
  ["path", { d: "M20 10 4 13.5" }]
];

// node_modules/lucide/dist/esm/icons/save-all.js
var SaveAll = [
  ["path", { d: "M10 2v3a1 1 0 0 0 1 1h5" }],
  ["path", { d: "M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6" }],
  ["path", { d: "M18 22H4a2 2 0 0 1-2-2V6" }],
  [
    "path",
    {
      d: "M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/save-off.js
var SaveOff = [
  ["path", { d: "M13 13H8a1 1 0 0 0-1 1v7" }],
  ["path", { d: "M14 8h1" }],
  ["path", { d: "M17 21v-4" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20.41 20.41A2 2 0 0 1 19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 .59-1.41" }],
  ["path", { d: "M29.5 11.5s5 5 4 5" }],
  ["path", { d: "M9 3h6.2a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V15" }]
];

// node_modules/lucide/dist/esm/icons/save.js
var Save = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }]
];

// node_modules/lucide/dist/esm/icons/scale-3d.js
var Scale3d = [
  ["path", { d: "M5 7v11a1 1 0 0 0 1 1h11" }],
  ["path", { d: "M5.293 18.707 11 13" }],
  ["circle", { cx: "19", cy: "19", r: "2" }],
  ["circle", { cx: "5", cy: "5", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/scale.js
var Scale = [
  ["path", { d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }],
  ["path", { d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" }],
  ["path", { d: "M7 21h10" }],
  ["path", { d: "M12 3v18" }],
  ["path", { d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" }]
];

// node_modules/lucide/dist/esm/icons/scaling.js
var Scaling = [
  ["path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }],
  ["path", { d: "M14 15H9v-5" }],
  ["path", { d: "M16 3h5v5" }],
  ["path", { d: "M21 3 9 15" }]
];

// node_modules/lucide/dist/esm/icons/scan-barcode.js
var ScanBarcode = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M8 7v10" }],
  ["path", { d: "M12 7v10" }],
  ["path", { d: "M17 7v10" }]
];

// node_modules/lucide/dist/esm/icons/scan-eye.js
var ScanEye = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["circle", { cx: "12", cy: "12", r: "1" }],
  [
    "path",
    {
      d: "M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/scan-face.js
var ScanFace = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }],
  ["path", { d: "M9 9h.01" }],
  ["path", { d: "M15 9h.01" }]
];

// node_modules/lucide/dist/esm/icons/scan-heart.js
var ScanHeart = [
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  [
    "path",
    { d: "M7.828 13.07A3 3 0 0 1 12 8.764a3 3 0 0 1 4.172 4.306l-3.447 3.62a1 1 0 0 1-1.449 0z" }
  ]
];

// node_modules/lucide/dist/esm/icons/scan-line.js
var ScanLine = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M7 12h10" }]
];

// node_modules/lucide/dist/esm/icons/scan-qr-code.js
var ScanQrCode = [
  ["path", { d: "M17 12v4a1 1 0 0 1-1 1h-4" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M17 8V7" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M7 17h.01" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["rect", { x: "7", y: "7", width: "5", height: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/scan-search.js
var ScanSearch = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "m16 16-1.9-1.9" }]
];

// node_modules/lucide/dist/esm/icons/scan-text.js
var ScanText = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M7 8h8" }],
  ["path", { d: "M7 12h10" }],
  ["path", { d: "M7 16h6" }]
];

// node_modules/lucide/dist/esm/icons/scan.js
var Scan = [
  ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }],
  ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }],
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]
];

// node_modules/lucide/dist/esm/icons/school.js
var School = [
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
  ["path", { d: "M18 5v16" }],
  ["path", { d: "m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" }],
  [
    "path",
    {
      d: "m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"
    }
  ],
  ["path", { d: "M6 5v16" }],
  ["circle", { cx: "12", cy: "9", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/scissors-line-dashed.js
var ScissorsLineDashed = [
  ["path", { d: "M5.42 9.42 8 12" }],
  ["circle", { cx: "4", cy: "8", r: "2" }],
  ["path", { d: "m14 6-8.58 8.58" }],
  ["circle", { cx: "4", cy: "16", r: "2" }],
  ["path", { d: "M10.8 14.8 14 18" }],
  ["path", { d: "M16 12h-2" }],
  ["path", { d: "M22 12h-2" }]
];

// node_modules/lucide/dist/esm/icons/scissors.js
var Scissors = [
  ["circle", { cx: "6", cy: "6", r: "3" }],
  ["path", { d: "M8.12 8.12 12 12" }],
  ["path", { d: "M20 4 8.12 15.88" }],
  ["circle", { cx: "6", cy: "18", r: "3" }],
  ["path", { d: "M14.8 14.8 20 20" }]
];

// node_modules/lucide/dist/esm/icons/screen-share-off.js
var ScreenShareOff = [
  ["path", { d: "M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" }],
  ["path", { d: "M8 21h8" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "m22 3-5 5" }],
  ["path", { d: "m17 3 5 5" }]
];

// node_modules/lucide/dist/esm/icons/screen-share.js
var ScreenShare = [
  ["path", { d: "M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" }],
  ["path", { d: "M8 21h8" }],
  ["path", { d: "M12 17v4" }],
  ["path", { d: "m17 8 5-5" }],
  ["path", { d: "M17 3h5v5" }]
];

// node_modules/lucide/dist/esm/icons/scroll-text.js
var ScrollText = [
  ["path", { d: "M15 12h-5" }],
  ["path", { d: "M15 8h-5" }],
  ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
  [
    "path",
    {
      d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/scroll.js
var Scroll = [
  ["path", { d: "M19 17V5a2 2 0 0 0-2-2H4" }],
  [
    "path",
    {
      d: "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/search-code.js
var SearchCode = [
  ["path", { d: "m13 13.5 2-2.5-2-2.5" }],
  ["path", { d: "m21 21-4.3-4.3" }],
  ["path", { d: "M9 8.5 7 11l2 2.5" }],
  ["circle", { cx: "11", cy: "11", r: "8" }]
];

// node_modules/lucide/dist/esm/icons/search-check.js
var SearchCheck = [
  ["path", { d: "m8 11 2 2 4-4" }],
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }]
];

// node_modules/lucide/dist/esm/icons/search-slash.js
var SearchSlash = [
  ["path", { d: "m13.5 8.5-5 5" }],
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }]
];

// node_modules/lucide/dist/esm/icons/search-x.js
var SearchX = [
  ["path", { d: "m13.5 8.5-5 5" }],
  ["path", { d: "m8.5 8.5 5 5" }],
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }]
];

// node_modules/lucide/dist/esm/icons/search.js
var Search = [
  ["path", { d: "m21 21-4.34-4.34" }],
  ["circle", { cx: "11", cy: "11", r: "8" }]
];

// node_modules/lucide/dist/esm/icons/section.js
var Section = [
  ["path", { d: "M16 5a4 3 0 0 0-8 0c0 4 8 3 8 7a4 3 0 0 1-8 0" }],
  ["path", { d: "M8 19a4 3 0 0 0 8 0c0-4-8-3-8-7a4 3 0 0 1 8 0" }]
];

// node_modules/lucide/dist/esm/icons/send-horizontal.js
var SendHorizontal = [
  [
    "path",
    {
      d: "M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"
    }
  ],
  ["path", { d: "M6 12h16" }]
];

// node_modules/lucide/dist/esm/icons/send-to-back.js
var SendToBack = [
  ["rect", { x: "14", y: "14", width: "8", height: "8", rx: "2" }],
  ["rect", { x: "2", y: "2", width: "8", height: "8", rx: "2" }],
  ["path", { d: "M7 14v1a2 2 0 0 0 2 2h1" }],
  ["path", { d: "M14 7h1a2 2 0 0 1 2 2v1" }]
];

// node_modules/lucide/dist/esm/icons/send.js
var Send = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939" }]
];

// node_modules/lucide/dist/esm/icons/separator-horizontal.js
var SeparatorHorizontal = [
  ["path", { d: "m16 16-4 4-4-4" }],
  ["path", { d: "M3 12h18" }],
  ["path", { d: "m8 8 4-4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/server-cog.js
var ServerCog = [
  ["path", { d: "m10.852 14.772-.383.923" }],
  ["path", { d: "M13.148 14.772a3 3 0 1 0-2.296-5.544l-.383-.923" }],
  ["path", { d: "m13.148 9.228.383-.923" }],
  ["path", { d: "m13.53 15.696-.382-.924a3 3 0 1 1-2.296-5.544" }],
  ["path", { d: "m14.772 10.852.923-.383" }],
  ["path", { d: "m14.772 13.148.923.383" }],
  ["path", { d: "M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5" }],
  ["path", { d: "M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "M6 6h.01" }],
  ["path", { d: "m9.228 10.852-.923-.383" }],
  ["path", { d: "m9.228 13.148-.923.383" }]
];

// node_modules/lucide/dist/esm/icons/separator-vertical.js
var SeparatorVertical = [
  ["path", { d: "M12 3v18" }],
  ["path", { d: "m16 16 4-4-4-4" }],
  ["path", { d: "m8 8-4 4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/server-crash.js
var ServerCrash = [
  ["path", { d: "M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" }],
  ["path", { d: "M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2" }],
  ["path", { d: "M6 6h.01" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "m13 6-4 6h6l-4 6" }]
];

// node_modules/lucide/dist/esm/icons/server-off.js
var ServerOff = [
  ["path", { d: "M7 2h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5" }],
  ["path", { d: "M10 10 2.5 2.5C2 2 2 2.5 2 5v3a2 2 0 0 0 2 2h6z" }],
  ["path", { d: "M22 17v-1a2 2 0 0 0-2-2h-1" }],
  ["path", { d: "M4 14a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16.5l1-.5.5.5-8-8H4z" }],
  ["path", { d: "M6 18h.01" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/server.js
var Server = [
  ["rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }],
  ["rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }],
  ["line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }],
  ["line", { x1: "6", x2: "6.01", y1: "18", y2: "18" }]
];

// node_modules/lucide/dist/esm/icons/settings-2.js
var Settings2 = [
  ["path", { d: "M14 17H5" }],
  ["path", { d: "M19 7h-9" }],
  ["circle", { cx: "17", cy: "17", r: "3" }],
  ["circle", { cx: "7", cy: "7", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/settings.js
var Settings = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/shapes.js
var Shapes = [
  [
    "path",
    {
      d: "M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"
    }
  ],
  ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }],
  ["circle", { cx: "17.5", cy: "17.5", r: "3.5" }]
];

// node_modules/lucide/dist/esm/icons/share-2.js
var Share2 = [
  ["circle", { cx: "18", cy: "5", r: "3" }],
  ["circle", { cx: "6", cy: "12", r: "3" }],
  ["circle", { cx: "18", cy: "19", r: "3" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49" }]
];

// node_modules/lucide/dist/esm/icons/share.js
var Share = [
  ["path", { d: "M12 2v13" }],
  ["path", { d: "m16 6-4-4-4 4" }],
  ["path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }]
];

// node_modules/lucide/dist/esm/icons/shell.js
var Shell = [
  [
    "path",
    {
      d: "M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/sheet.js
var Sheet = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["line", { x1: "3", x2: "21", y1: "9", y2: "9" }],
  ["line", { x1: "3", x2: "21", y1: "15", y2: "15" }],
  ["line", { x1: "9", x2: "9", y1: "9", y2: "21" }],
  ["line", { x1: "15", x2: "15", y1: "9", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/shield-ban.js
var ShieldBan = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "m4.243 5.21 14.39 12.472" }]
];

// node_modules/lucide/dist/esm/icons/shield-alert.js
var ShieldAlert = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M12 8v4" }],
  ["path", { d: "M12 16h.01" }]
];

// node_modules/lucide/dist/esm/icons/shield-check.js
var ShieldCheck = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/shield-ellipsis.js
var ShieldEllipsis = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M8 12h.01" }],
  ["path", { d: "M12 12h.01" }],
  ["path", { d: "M16 12h.01" }]
];

// node_modules/lucide/dist/esm/icons/shield-half.js
var ShieldHalf = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M12 22V2" }]
];

// node_modules/lucide/dist/esm/icons/shield-minus.js
var ShieldMinus = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M9 12h6" }]
];

// node_modules/lucide/dist/esm/icons/shield-off.js
var ShieldOff = [
  ["path", { d: "m2 2 20 20" }],
  [
    "path",
    {
      d: "M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"
    }
  ],
  [
    "path",
    {
      d: "M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/shield-plus.js
var ShieldPlus = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M9 12h6" }],
  ["path", { d: "M12 9v6" }]
];

// node_modules/lucide/dist/esm/icons/shield-question-mark.js
var ShieldQuestionMark = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" }],
  ["path", { d: "M12 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/shield-user.js
var ShieldUser = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "M6.376 18.91a6 6 0 0 1 11.249.003" }],
  ["circle", { cx: "12", cy: "11", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/shield-x.js
var ShieldX = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ],
  ["path", { d: "m14.5 9.5-5 5" }],
  ["path", { d: "m9.5 9.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/shield.js
var Shield = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/ship-wheel.js
var ShipWheel = [
  ["circle", { cx: "12", cy: "12", r: "8" }],
  ["path", { d: "M12 2v7.5" }],
  ["path", { d: "m19 5-5.23 5.23" }],
  ["path", { d: "M22 12h-7.5" }],
  ["path", { d: "m19 19-5.23-5.23" }],
  ["path", { d: "M12 14.5V22" }],
  ["path", { d: "M10.23 13.77 5 19" }],
  ["path", { d: "M9.5 12H2" }],
  ["path", { d: "M10.23 10.23 5 5" }],
  ["circle", { cx: "12", cy: "12", r: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/ship.js
var Ship = [
  ["path", { d: "M12 10.189V14" }],
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" }],
  [
    "path",
    {
      d: "M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"
    }
  ],
  [
    "path",
    {
      d: "M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/shirt.js
var Shirt = [
  [
    "path",
    {
      d: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/shopping-bag.js
var ShoppingBag = [
  ["path", { d: "M16 10a4 4 0 0 1-8 0" }],
  ["path", { d: "M3.103 6.034h17.794" }],
  [
    "path",
    {
      d: "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/shopping-basket.js
var ShoppingBasket = [
  ["path", { d: "m15 11-1 9" }],
  ["path", { d: "m19 11-4-7" }],
  ["path", { d: "M2 11h20" }],
  ["path", { d: "m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" }],
  ["path", { d: "M4.5 15.5h15" }],
  ["path", { d: "m5 11 4-7" }],
  ["path", { d: "m9 11 1 9" }]
];

// node_modules/lucide/dist/esm/icons/shopping-cart.js
var ShoppingCart = [
  ["circle", { cx: "8", cy: "21", r: "1" }],
  ["circle", { cx: "19", cy: "21", r: "1" }],
  [
    "path",
    { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" }
  ]
];

// node_modules/lucide/dist/esm/icons/shovel.js
var Shovel = [
  [
    "path",
    {
      d: "M21.56 4.56a1.5 1.5 0 0 1 0 2.122l-.47.47a3 3 0 0 1-4.212-.03 3 3 0 0 1 0-4.243l.44-.44a1.5 1.5 0 0 1 2.121 0z"
    }
  ],
  [
    "path",
    {
      d: "M3 22a1 1 0 0 1-1-1v-3.586a1 1 0 0 1 .293-.707l3.355-3.355a1.205 1.205 0 0 1 1.704 0l3.296 3.296a1.205 1.205 0 0 1 0 1.704l-3.355 3.355a1 1 0 0 1-.707.293z"
    }
  ],
  ["path", { d: "m9 15 7.879-7.878" }]
];

// node_modules/lucide/dist/esm/icons/shower-head.js
var ShowerHead = [
  ["path", { d: "m4 4 2.5 2.5" }],
  ["path", { d: "M13.5 6.5a4.95 4.95 0 0 0-7 7" }],
  ["path", { d: "M15 5 5 15" }],
  ["path", { d: "M14 17v.01" }],
  ["path", { d: "M10 16v.01" }],
  ["path", { d: "M13 13v.01" }],
  ["path", { d: "M16 10v.01" }],
  ["path", { d: "M11 20v.01" }],
  ["path", { d: "M17 14v.01" }],
  ["path", { d: "M20 11v.01" }]
];

// node_modules/lucide/dist/esm/icons/shredder.js
var Shredder = [
  ["path", { d: "M10 22v-5" }],
  ["path", { d: "M14 19v-2" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M18 20v-3" }],
  ["path", { d: "M2 13h20" }],
  ["path", { d: "M20 13V7l-5-5H6a2 2 0 0 0-2 2v9" }],
  ["path", { d: "M6 20v-3" }]
];

// node_modules/lucide/dist/esm/icons/shrimp.js
var Shrimp = [
  ["path", { d: "M11 12h.01" }],
  ["path", { d: "M13 22c.5-.5 1.12-1 2.5-1-1.38 0-2-.5-2.5-1" }],
  [
    "path",
    {
      d: "M14 2a3.28 3.28 0 0 1-3.227 1.798l-6.17-.561A2.387 2.387 0 1 0 4.387 8H15.5a1 1 0 0 1 0 13 1 1 0 0 0 0-5H12a7 7 0 0 1-7-7V8"
    }
  ],
  ["path", { d: "M14 8a8.5 8.5 0 0 1 0 8" }],
  ["path", { d: "M16 16c2 0 4.5-4 4-6" }]
];

// node_modules/lucide/dist/esm/icons/shrink.js
var Shrink = [
  ["path", { d: "m15 15 6 6m-6-6v4.8m0-4.8h4.8" }],
  ["path", { d: "M9 19.8V15m0 0H4.2M9 15l-6 6" }],
  ["path", { d: "M15 4.2V9m0 0h4.8M15 9l6-6" }],
  ["path", { d: "M9 4.2V9m0 0H4.2M9 9 3 3" }]
];

// node_modules/lucide/dist/esm/icons/shrub.js
var Shrub = [
  ["path", { d: "M12 22v-5.172a2 2 0 0 0-.586-1.414L9.5 13.5" }],
  ["path", { d: "M14.5 14.5 12 17" }],
  ["path", { d: "M17 8.8A6 6 0 0 1 13.8 20H10A6.5 6.5 0 0 1 7 8a5 5 0 0 1 10 0z" }]
];

// node_modules/lucide/dist/esm/icons/shuffle.js
var Shuffle = [
  ["path", { d: "m18 14 4 4-4 4" }],
  ["path", { d: "m18 2 4 4-4 4" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" }]
];

// node_modules/lucide/dist/esm/icons/sigma.js
var Sigma = [
  [
    "path",
    {
      d: "M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/signal-high.js
var SignalHigh = [
  ["path", { d: "M2 20h.01" }],
  ["path", { d: "M7 20v-4" }],
  ["path", { d: "M12 20v-8" }],
  ["path", { d: "M17 20V8" }]
];

// node_modules/lucide/dist/esm/icons/signal-low.js
var SignalLow = [
  ["path", { d: "M2 20h.01" }],
  ["path", { d: "M7 20v-4" }]
];

// node_modules/lucide/dist/esm/icons/signal-medium.js
var SignalMedium = [
  ["path", { d: "M2 20h.01" }],
  ["path", { d: "M7 20v-4" }],
  ["path", { d: "M12 20v-8" }]
];

// node_modules/lucide/dist/esm/icons/signal-zero.js
var SignalZero = [["path", { d: "M2 20h.01" }]];

// node_modules/lucide/dist/esm/icons/signal.js
var Signal = [
  ["path", { d: "M2 20h.01" }],
  ["path", { d: "M7 20v-4" }],
  ["path", { d: "M12 20v-8" }],
  ["path", { d: "M17 20V8" }],
  ["path", { d: "M22 4v16" }]
];

// node_modules/lucide/dist/esm/icons/signature.js
var Signature = [
  [
    "path",
    {
      d: "m21 17-2.156-1.868A.5.5 0 0 0 18 15.5v.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1c0-2.545-3.991-3.97-8.5-4a1 1 0 0 0 0 5c4.153 0 4.745-11.295 5.708-13.5a2.5 2.5 0 1 1 3.31 3.284"
    }
  ],
  ["path", { d: "M3 21h18" }]
];

// node_modules/lucide/dist/esm/icons/signpost-big.js
var SignpostBig = [
  ["path", { d: "M10 9H4L2 7l2-2h6" }],
  ["path", { d: "M14 5h6l2 2-2 2h-6" }],
  ["path", { d: "M10 22V4a2 2 0 1 1 4 0v18" }],
  ["path", { d: "M8 22h8" }]
];

// node_modules/lucide/dist/esm/icons/signpost.js
var Signpost = [
  ["path", { d: "M12 13v8" }],
  ["path", { d: "M12 3v3" }],
  [
    "path",
    {
      d: "M18 6a2 2 0 0 1 1.387.56l2.307 2.22a1 1 0 0 1 0 1.44l-2.307 2.22A2 2 0 0 1 18 13H6a2 2 0 0 1-1.387-.56l-2.306-2.22a1 1 0 0 1 0-1.44l2.306-2.22A2 2 0 0 1 6 6z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/siren.js
var Siren = [
  ["path", { d: "M7 18v-6a5 5 0 1 1 10 0v6" }],
  ["path", { d: "M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" }],
  ["path", { d: "M21 12h1" }],
  ["path", { d: "M18.5 4.5 18 5" }],
  ["path", { d: "M2 12h1" }],
  ["path", { d: "M12 2v1" }],
  ["path", { d: "m4.929 4.929.707.707" }],
  ["path", { d: "M12 12v6" }]
];

// node_modules/lucide/dist/esm/icons/skip-back.js
var SkipBack = [
  [
    "path",
    {
      d: "M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"
    }
  ],
  ["path", { d: "M3 20V4" }]
];

// node_modules/lucide/dist/esm/icons/skip-forward.js
var SkipForward = [
  ["path", { d: "M21 4v16" }],
  [
    "path",
    { d: "M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" }
  ]
];

// node_modules/lucide/dist/esm/icons/skull.js
var Skull = [
  ["path", { d: "m12.5 17-.5-1-.5 1h1z" }],
  [
    "path",
    {
      d: "M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"
    }
  ],
  ["circle", { cx: "15", cy: "12", r: "1" }],
  ["circle", { cx: "9", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/slack.js
var Slack = [
  ["rect", { width: "3", height: "8", x: "13", y: "2", rx: "1.5" }],
  ["path", { d: "M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" }],
  ["rect", { width: "3", height: "8", x: "8", y: "14", rx: "1.5" }],
  ["path", { d: "M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" }],
  ["rect", { width: "8", height: "3", x: "14", y: "13", rx: "1.5" }],
  ["path", { d: "M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" }],
  ["rect", { width: "8", height: "3", x: "2", y: "8", rx: "1.5" }],
  ["path", { d: "M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" }]
];

// node_modules/lucide/dist/esm/icons/slash.js
var Slash = [["path", { d: "M22 2 2 22" }]];

// node_modules/lucide/dist/esm/icons/slice.js
var Slice = [
  [
    "path",
    {
      d: "M11 16.586V19a1 1 0 0 1-1 1H2L18.37 3.63a1 1 0 1 1 3 3l-9.663 9.663a1 1 0 0 1-1.414 0L8 14"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/sliders-horizontal.js
var SlidersHorizontal = [
  ["path", { d: "M10 5H3" }],
  ["path", { d: "M12 19H3" }],
  ["path", { d: "M14 3v4" }],
  ["path", { d: "M16 17v4" }],
  ["path", { d: "M21 12h-9" }],
  ["path", { d: "M21 19h-5" }],
  ["path", { d: "M21 5h-7" }],
  ["path", { d: "M8 10v4" }],
  ["path", { d: "M8 12H3" }]
];

// node_modules/lucide/dist/esm/icons/smartphone-charging.js
var SmartphoneCharging = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" }],
  ["path", { d: "M12.667 8 10 12h4l-2.667 4" }]
];

// node_modules/lucide/dist/esm/icons/sliders-vertical.js
var SlidersVertical = [
  ["path", { d: "M10 8h4" }],
  ["path", { d: "M12 21v-9" }],
  ["path", { d: "M12 8V3" }],
  ["path", { d: "M17 16h4" }],
  ["path", { d: "M19 12V3" }],
  ["path", { d: "M19 21v-5" }],
  ["path", { d: "M3 14h4" }],
  ["path", { d: "M5 10V3" }],
  ["path", { d: "M5 21v-7" }]
];

// node_modules/lucide/dist/esm/icons/smartphone-nfc.js
var SmartphoneNfc = [
  ["rect", { width: "7", height: "12", x: "2", y: "6", rx: "1" }],
  ["path", { d: "M13 8.32a7.43 7.43 0 0 1 0 7.36" }],
  ["path", { d: "M16.46 6.21a11.76 11.76 0 0 1 0 11.58" }],
  ["path", { d: "M19.91 4.1a15.91 15.91 0 0 1 .01 15.8" }]
];

// node_modules/lucide/dist/esm/icons/smartphone.js
var Smartphone = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" }],
  ["path", { d: "M12 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/smile-plus.js
var SmilePlus = [
  ["path", { d: "M22 11v1a10 10 0 1 1-9-10" }],
  ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }],
  ["path", { d: "M16 5h6" }],
  ["path", { d: "M19 2v6" }]
];

// node_modules/lucide/dist/esm/icons/smile.js
var Smile = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/snail.js
var Snail = [
  ["path", { d: "M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0" }],
  ["circle", { cx: "10", cy: "13", r: "8" }],
  ["path", { d: "M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6" }],
  ["path", { d: "M18 3 19.1 5.2" }],
  ["path", { d: "M22 3 20.9 5.2" }]
];

// node_modules/lucide/dist/esm/icons/soap-dispenser-droplet.js
var SoapDispenserDroplet = [
  ["path", { d: "M10.5 2v4" }],
  ["path", { d: "M14 2H7a2 2 0 0 0-2 2" }],
  [
    "path",
    {
      d: "M19.29 14.76A6.67 6.67 0 0 1 17 11a6.6 6.6 0 0 1-2.29 3.76c-1.15.92-1.71 2.04-1.71 3.19 0 2.22 1.8 4.05 4 4.05s4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19"
    }
  ],
  ["path", { d: "M9.607 21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h7V7a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" }]
];

// node_modules/lucide/dist/esm/icons/snowflake.js
var Snowflake = [
  ["path", { d: "m10 20-1.25-2.5L6 18" }],
  ["path", { d: "M10 4 8.75 6.5 6 6" }],
  ["path", { d: "m14 20 1.25-2.5L18 18" }],
  ["path", { d: "m14 4 1.25 2.5L18 6" }],
  ["path", { d: "m17 21-3-6h-4" }],
  ["path", { d: "m17 3-3 6 1.5 3" }],
  ["path", { d: "M2 12h6.5L10 9" }],
  ["path", { d: "m20 10-1.5 2 1.5 2" }],
  ["path", { d: "M22 12h-6.5L14 15" }],
  ["path", { d: "m4 10 1.5 2L4 14" }],
  ["path", { d: "m7 21 3-6-1.5-3" }],
  ["path", { d: "m7 3 3 6h4" }]
];

// node_modules/lucide/dist/esm/icons/sofa.js
var Sofa = [
  ["path", { d: "M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" }],
  [
    "path",
    {
      d: "M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"
    }
  ],
  ["path", { d: "M4 18v2" }],
  ["path", { d: "M20 18v2" }],
  ["path", { d: "M12 4v9" }]
];

// node_modules/lucide/dist/esm/icons/soup.js
var Soup = [
  ["path", { d: "M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" }],
  ["path", { d: "M7 21h10" }],
  ["path", { d: "M19.5 12 22 6" }],
  ["path", { d: "M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62" }],
  ["path", { d: "M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62" }],
  ["path", { d: "M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62" }]
];

// node_modules/lucide/dist/esm/icons/space.js
var Space = [["path", { d: "M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" }]];

// node_modules/lucide/dist/esm/icons/spade.js
var Spade = [
  ["path", { d: "M12 18v4" }],
  [
    "path",
    {
      d: "M2 14.499a5.5 5.5 0 0 0 9.591 3.675.6.6 0 0 1 .818.001A5.5 5.5 0 0 0 22 14.5c0-2.29-1.5-4-3-5.5l-5.492-5.312a2 2 0 0 0-3-.02L5 8.999c-1.5 1.5-3 3.2-3 5.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/sparkle.js
var Sparkle = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/sparkles.js
var Sparkles = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
    }
  ],
  ["path", { d: "M20 2v4" }],
  ["path", { d: "M22 4h-4" }],
  ["circle", { cx: "4", cy: "20", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/speaker.js
var Speaker = [
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2" }],
  ["path", { d: "M12 6h.01" }],
  ["circle", { cx: "12", cy: "14", r: "4" }],
  ["path", { d: "M12 14h.01" }]
];

// node_modules/lucide/dist/esm/icons/speech.js
var Speech = [
  [
    "path",
    {
      d: "M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"
    }
  ],
  ["path", { d: "M19.8 17.8a7.5 7.5 0 0 0 .003-10.603" }],
  ["path", { d: "M17 15a3.5 3.5 0 0 0-.025-4.975" }]
];

// node_modules/lucide/dist/esm/icons/spell-check-2.js
var SpellCheck2 = [
  ["path", { d: "m6 16 6-12 6 12" }],
  ["path", { d: "M8 12h8" }],
  [
    "path",
    {
      d: "M4 21c1.1 0 1.1-1 2.3-1s1.1 1 2.3 1c1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/spell-check.js
var SpellCheck = [
  ["path", { d: "m6 16 6-12 6 12" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "m16 20 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/spline-pointer.js
var SplinePointer = [
  [
    "path",
    {
      d: "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"
    }
  ],
  ["path", { d: "M5 17A12 12 0 0 1 17 5" }],
  ["circle", { cx: "19", cy: "5", r: "2" }],
  ["circle", { cx: "5", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/spline.js
var Spline = [
  ["circle", { cx: "19", cy: "5", r: "2" }],
  ["circle", { cx: "5", cy: "19", r: "2" }],
  ["path", { d: "M5 17A12 12 0 0 1 17 5" }]
];

// node_modules/lucide/dist/esm/icons/split.js
var Split = [
  ["path", { d: "M16 3h5v5" }],
  ["path", { d: "M8 3H3v5" }],
  ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" }],
  ["path", { d: "m15 9 6-6" }]
];

// node_modules/lucide/dist/esm/icons/spool.js
var Spool = [
  [
    "path",
    {
      d: "M17 13.44 4.442 17.082A2 2 0 0 0 4.982 21H19a2 2 0 0 0 .558-3.921l-1.115-.32A2 2 0 0 1 17 14.837V7.66"
    }
  ],
  [
    "path",
    {
      d: "m7 10.56 12.558-3.642A2 2 0 0 0 19.018 3H5a2 2 0 0 0-.558 3.921l1.115.32A2 2 0 0 1 7 9.163v7.178"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/spotlight.js
var Spotlight = [
  ["path", { d: "M15.295 19.562 16 22" }],
  ["path", { d: "m17 16 3.758 2.098" }],
  ["path", { d: "m19 12.5 3.026-.598" }],
  [
    "path",
    {
      d: "M7.61 6.3a3 3 0 0 0-3.92 1.3l-1.38 2.79a3 3 0 0 0 1.3 3.91l6.89 3.597a1 1 0 0 0 1.342-.447l3.106-6.211a1 1 0 0 0-.447-1.341z"
    }
  ],
  ["path", { d: "M8 9V2" }]
];

// node_modules/lucide/dist/esm/icons/spray-can.js
var SprayCan = [
  ["path", { d: "M3 3h.01" }],
  ["path", { d: "M7 5h.01" }],
  ["path", { d: "M11 7h.01" }],
  ["path", { d: "M3 7h.01" }],
  ["path", { d: "M7 9h.01" }],
  ["path", { d: "M3 11h.01" }],
  ["rect", { width: "4", height: "4", x: "15", y: "5" }],
  ["path", { d: "m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2" }],
  ["path", { d: "m13 14 8-2" }],
  ["path", { d: "m13 19 8-2" }]
];

// node_modules/lucide/dist/esm/icons/sprout.js
var Sprout = [
  [
    "path",
    {
      d: "M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"
    }
  ],
  ["path", { d: "M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" }],
  ["path", { d: "M5 21h14" }]
];

// node_modules/lucide/dist/esm/icons/square-activity.js
var SquareActivity = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M17 12h-2l-2 5-2-10-2 5H7" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-down-left.js
var SquareArrowDownLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m16 8-8 8" }],
  ["path", { d: "M16 16H8V8" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-down-right.js
var SquareArrowDownRight = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m8 8 8 8" }],
  ["path", { d: "M16 8v8H8" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-down.js
var SquareArrowDown = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M12 8v8" }],
  ["path", { d: "m8 12 4 4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-left.js
var SquareArrowLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m12 8-4 4 4 4" }],
  ["path", { d: "M16 12H8" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-out-down-left.js
var SquareArrowOutDownLeft = [
  ["path", { d: "M13 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" }],
  ["path", { d: "m3 21 9-9" }],
  ["path", { d: "M9 21H3v-6" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-out-down-right.js
var SquareArrowOutDownRight = [
  ["path", { d: "M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" }],
  ["path", { d: "m21 21-9-9" }],
  ["path", { d: "M21 15v6h-6" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-out-up-left.js
var SquareArrowOutUpLeft = [
  ["path", { d: "M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" }],
  ["path", { d: "m3 3 9 9" }],
  ["path", { d: "M3 9V3h6" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-out-up-right.js
var SquareArrowOutUpRight = [
  ["path", { d: "M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" }],
  ["path", { d: "m21 3-9 9" }],
  ["path", { d: "M15 3h6v6" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-right.js
var SquareArrowRight = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "m12 16 4-4-4-4" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-up-left.js
var SquareArrowUpLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 16V8h8" }],
  ["path", { d: "M16 16 8 8" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-up-right.js
var SquareArrowUpRight = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 8h8v8" }],
  ["path", { d: "m8 16 8-8" }]
];

// node_modules/lucide/dist/esm/icons/square-arrow-up.js
var SquareArrowUp = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m16 12-4-4-4 4" }],
  ["path", { d: "M12 16V8" }]
];

// node_modules/lucide/dist/esm/icons/square-asterisk.js
var SquareAsterisk = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M12 8v8" }],
  ["path", { d: "m8.5 14 7-4" }],
  ["path", { d: "m8.5 10 7 4" }]
];

// node_modules/lucide/dist/esm/icons/square-bottom-dashed-scissors.js
var SquareBottomDashedScissors = [
  ["path", { d: "M4 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2" }],
  ["path", { d: "M10 22H8" }],
  ["path", { d: "M16 22h-2" }],
  ["circle", { cx: "8", cy: "8", r: "2" }],
  ["path", { d: "M9.414 9.414 12 12" }],
  ["path", { d: "M14.8 14.8 18 18" }],
  ["circle", { cx: "8", cy: "16", r: "2" }],
  ["path", { d: "m18 6-8.586 8.586" }]
];

// node_modules/lucide/dist/esm/icons/square-chart-gantt.js
var SquareChartGantt = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 8h7" }],
  ["path", { d: "M8 12h6" }],
  ["path", { d: "M11 16h5" }]
];

// node_modules/lucide/dist/esm/icons/square-check-big.js
var SquareCheckBig = [
  ["path", { d: "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" }],
  ["path", { d: "m9 11 3 3L22 4" }]
];

// node_modules/lucide/dist/esm/icons/square-check.js
var SquareCheck = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m9 12 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/square-chevron-down.js
var SquareChevronDown = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m16 10-4 4-4-4" }]
];

// node_modules/lucide/dist/esm/icons/square-chevron-left.js
var SquareChevronLeft = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m14 16-4-4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/square-chevron-right.js
var SquareChevronRight = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m10 8 4 4-4 4" }]
];

// node_modules/lucide/dist/esm/icons/square-chevron-up.js
var SquareChevronUp = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m8 14 4-4 4 4" }]
];

// node_modules/lucide/dist/esm/icons/square-code.js
var SquareCode = [
  ["path", { d: "m10 9-3 3 3 3" }],
  ["path", { d: "m14 15 3-3-3-3" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed-bottom-code.js
var SquareDashedBottomCode = [
  ["path", { d: "M10 9.5 8 12l2 2.5" }],
  ["path", { d: "M14 21h1" }],
  ["path", { d: "m14 9.5 2 2.5-2 2.5" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2" }],
  ["path", { d: "M9 21h1" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed-bottom.js
var SquareDashedBottom = [
  ["path", { d: "M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2" }],
  ["path", { d: "M9 21h1" }],
  ["path", { d: "M14 21h1" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed-kanban.js
var SquareDashedKanban = [
  ["path", { d: "M8 7v7" }],
  ["path", { d: "M12 7v4" }],
  ["path", { d: "M16 7v9" }],
  ["path", { d: "M5 3a2 2 0 0 0-2 2" }],
  ["path", { d: "M9 3h1" }],
  ["path", { d: "M14 3h1" }],
  ["path", { d: "M19 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M21 9v1" }],
  ["path", { d: "M21 14v1" }],
  ["path", { d: "M21 19a2 2 0 0 1-2 2" }],
  ["path", { d: "M14 21h1" }],
  ["path", { d: "M9 21h1" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M3 14v1" }],
  ["path", { d: "M3 9v1" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed-mouse-pointer.js
var SquareDashedMousePointer = [
  [
    "path",
    {
      d: "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"
    }
  ],
  ["path", { d: "M5 3a2 2 0 0 0-2 2" }],
  ["path", { d: "M19 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M9 3h1" }],
  ["path", { d: "M9 21h2" }],
  ["path", { d: "M14 3h1" }],
  ["path", { d: "M3 9v1" }],
  ["path", { d: "M21 9v2" }],
  ["path", { d: "M3 14v1" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed.js
var SquareDashed = [
  ["path", { d: "M5 3a2 2 0 0 0-2 2" }],
  ["path", { d: "M19 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M21 19a2 2 0 0 1-2 2" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M9 3h1" }],
  ["path", { d: "M9 21h1" }],
  ["path", { d: "M14 3h1" }],
  ["path", { d: "M14 21h1" }],
  ["path", { d: "M3 9v1" }],
  ["path", { d: "M21 9v1" }],
  ["path", { d: "M3 14v1" }],
  ["path", { d: "M21 14v1" }]
];

// node_modules/lucide/dist/esm/icons/square-dashed-top-solid.js
var SquareDashedTopSolid = [
  ["path", { d: "M14 21h1" }],
  ["path", { d: "M21 14v1" }],
  ["path", { d: "M21 19a2 2 0 0 1-2 2" }],
  ["path", { d: "M21 9v1" }],
  ["path", { d: "M3 14v1" }],
  ["path", { d: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" }],
  ["path", { d: "M3 9v1" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M9 21h1" }]
];

// node_modules/lucide/dist/esm/icons/square-divide.js
var SquareDivide = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12" }],
  ["line", { x1: "12", x2: "12", y1: "16", y2: "16" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "8" }]
];

// node_modules/lucide/dist/esm/icons/square-dot.js
var SquareDot = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["circle", { cx: "12", cy: "12", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/square-equal.js
var SquareEqual = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 10h10" }],
  ["path", { d: "M7 14h10" }]
];

// node_modules/lucide/dist/esm/icons/square-function.js
var SquareFunction = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3" }],
  ["path", { d: "M9 11.2h5.7" }]
];

// node_modules/lucide/dist/esm/icons/square-kanban.js
var SquareKanban = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 7v7" }],
  ["path", { d: "M12 7v4" }],
  ["path", { d: "M16 7v9" }]
];

// node_modules/lucide/dist/esm/icons/square-library.js
var SquareLibrary = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 7v10" }],
  ["path", { d: "M11 7v10" }],
  ["path", { d: "m15 7 2 10" }]
];

// node_modules/lucide/dist/esm/icons/square-m.js
var SquareM = [
  [
    "path",
    { d: "M8 16V8.5a.5.5 0 0 1 .9-.3l2.7 3.599a.5.5 0 0 0 .8 0l2.7-3.6a.5.5 0 0 1 .9.3V16" }
  ],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-menu.js
var SquareMenu = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 8h10" }],
  ["path", { d: "M7 12h10" }],
  ["path", { d: "M7 16h10" }]
];

// node_modules/lucide/dist/esm/icons/square-minus.js
var SquareMinus = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 12h8" }]
];

// node_modules/lucide/dist/esm/icons/square-mouse-pointer.js
var SquareMousePointer = [
  [
    "path",
    {
      d: "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"
    }
  ],
  ["path", { d: "M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" }]
];

// node_modules/lucide/dist/esm/icons/square-parking-off.js
var SquareParkingOff = [
  ["path", { d: "M3.6 3.6A2 2 0 0 1 5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-.59 1.41" }],
  ["path", { d: "M3 8.7V19a2 2 0 0 0 2 2h10.3" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M13 13a3 3 0 1 0 0-6H9v2" }],
  ["path", { d: "M9 17v-2.3" }]
];

// node_modules/lucide/dist/esm/icons/square-parking.js
var SquareParking = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M9 17V7h4a3 3 0 0 1 0 6H9" }]
];

// node_modules/lucide/dist/esm/icons/square-pen.js
var SquarePen = [
  ["path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }],
  [
    "path",
    {
      d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/square-pause.js
var SquarePause = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["line", { x1: "10", x2: "10", y1: "15", y2: "9" }],
  ["line", { x1: "14", x2: "14", y1: "15", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/square-percent.js
var SquarePercent = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "M9 9h.01" }],
  ["path", { d: "M15 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/square-pi.js
var SquarePi = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 7h10" }],
  ["path", { d: "M10 7v10" }],
  ["path", { d: "M16 17a2 2 0 0 1-2-2V7" }]
];

// node_modules/lucide/dist/esm/icons/square-pilcrow.js
var SquarePilcrow = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M12 12H9.5a2.5 2.5 0 0 1 0-5H17" }],
  ["path", { d: "M12 7v10" }],
  ["path", { d: "M16 7v10" }]
];

// node_modules/lucide/dist/esm/icons/square-play.js
var SquarePlay = [
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
  [
    "path",
    {
      d: "M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/square-plus.js
var SquarePlus = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "M12 8v8" }]
];

// node_modules/lucide/dist/esm/icons/square-power.js
var SquarePower = [
  ["path", { d: "M12 7v4" }],
  ["path", { d: "M7.998 9.003a5 5 0 1 0 8-.005" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-radical.js
var SquareRadical = [
  ["path", { d: "M7 12h2l2 5 2-10h4" }],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-scissors.js
var SquareScissors = [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "2" }],
  ["circle", { cx: "8", cy: "8", r: "2" }],
  ["path", { d: "M9.414 9.414 12 12" }],
  ["path", { d: "M14.8 14.8 18 18" }],
  ["circle", { cx: "8", cy: "16", r: "2" }],
  ["path", { d: "m18 6-8.586 8.586" }]
];

// node_modules/lucide/dist/esm/icons/square-round-corner.js
var SquareRoundCorner = [
  ["path", { d: "M21 11a8 8 0 0 0-8-8" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
];

// node_modules/lucide/dist/esm/icons/square-sigma.js
var SquareSigma = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M16 8.9V7H8l4 5-4 5h8v-1.9" }]
];

// node_modules/lucide/dist/esm/icons/square-slash.js
var SquareSlash = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["line", { x1: "9", x2: "15", y1: "15", y2: "9" }]
];

// node_modules/lucide/dist/esm/icons/square-split-horizontal.js
var SquareSplitHorizontal = [
  ["path", { d: "M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3" }],
  ["path", { d: "M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3" }],
  ["line", { x1: "12", x2: "12", y1: "4", y2: "20" }]
];

// node_modules/lucide/dist/esm/icons/square-split-vertical.js
var SquareSplitVertical = [
  ["path", { d: "M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3" }],
  ["path", { d: "M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3" }],
  ["line", { x1: "4", x2: "20", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/square-square.js
var SquareSquare = [
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
  ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/square-stack.js
var SquareStack = [
  ["path", { d: "M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" }],
  ["path", { d: "M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" }],
  ["rect", { width: "8", height: "8", x: "14", y: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-star.js
var SquareStar = [
  [
    "path",
    {
      d: "M11.035 7.69a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"
    }
  ],
  ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-stop.js
var SquareStop = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/square-terminal.js
var SquareTerminal = [
  ["path", { d: "m7 11 2-2-2-2" }],
  ["path", { d: "M11 13h4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-user-round.js
var SquareUserRound = [
  ["path", { d: "M18 21a6 6 0 0 0-12 0" }],
  ["circle", { cx: "12", cy: "11", r: "4" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/square-user.js
var SquareUser = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" }]
];

// node_modules/lucide/dist/esm/icons/square-x.js
var SquareX = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "m9 9 6 6" }]
];

// node_modules/lucide/dist/esm/icons/square.js
var Square = [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]];

// node_modules/lucide/dist/esm/icons/squares-exclude.js
var SquaresExclude = [
  [
    "path",
    {
      d: "M16 12v2a2 2 0 0 1-2 2H9a1 1 0 0 0-1 1v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h0"
    }
  ],
  [
    "path",
    {
      d: "M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-5a2 2 0 0 0-2 2v2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/squares-subtract.js
var SquaresSubtract = [
  ["path", { d: "M10 22a2 2 0 0 1-2-2" }],
  ["path", { d: "M16 22h-2" }],
  [
    "path",
    {
      d: "M16 4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-5a2 2 0 0 1 2-2h5a1 1 0 0 0 1-1z"
    }
  ],
  ["path", { d: "M20 8a2 2 0 0 1 2 2" }],
  ["path", { d: "M22 14v2" }],
  ["path", { d: "M22 20a2 2 0 0 1-2 2" }]
];

// node_modules/lucide/dist/esm/icons/squares-intersect.js
var SquaresIntersect = [
  ["path", { d: "M10 22a2 2 0 0 1-2-2" }],
  ["path", { d: "M14 2a2 2 0 0 1 2 2" }],
  ["path", { d: "M16 22h-2" }],
  ["path", { d: "M2 10V8" }],
  ["path", { d: "M2 4a2 2 0 0 1 2-2" }],
  ["path", { d: "M20 8a2 2 0 0 1 2 2" }],
  ["path", { d: "M22 14v2" }],
  ["path", { d: "M22 20a2 2 0 0 1-2 2" }],
  ["path", { d: "M4 16a2 2 0 0 1-2-2" }],
  ["path", { d: "M8 10a2 2 0 0 1 2-2h5a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2H9a1 1 0 0 1-1-1z" }],
  ["path", { d: "M8 2h2" }]
];

// node_modules/lucide/dist/esm/icons/squares-unite.js
var SquaresUnite = [
  [
    "path",
    {
      d: "M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a1 1 0 0 0-1-1z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/squircle-dashed.js
var SquircleDashed = [
  ["path", { d: "M13.77 3.043a34 34 0 0 0-3.54 0" }],
  ["path", { d: "M13.771 20.956a33 33 0 0 1-3.541.001" }],
  ["path", { d: "M20.18 17.74c-.51 1.15-1.29 1.93-2.439 2.44" }],
  ["path", { d: "M20.18 6.259c-.51-1.148-1.291-1.929-2.44-2.438" }],
  ["path", { d: "M20.957 10.23a33 33 0 0 1 0 3.54" }],
  ["path", { d: "M3.043 10.23a34 34 0 0 0 .001 3.541" }],
  ["path", { d: "M6.26 20.179c-1.15-.508-1.93-1.29-2.44-2.438" }],
  ["path", { d: "M6.26 3.82c-1.149.51-1.93 1.291-2.44 2.44" }]
];

// node_modules/lucide/dist/esm/icons/squircle.js
var Squircle = [
  ["path", { d: "M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9" }]
];

// node_modules/lucide/dist/esm/icons/squirrel.js
var Squirrel = [
  ["path", { d: "M15.236 22a3 3 0 0 0-2.2-5" }],
  ["path", { d: "M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4" }],
  ["path", { d: "M18 13h.01" }],
  [
    "path",
    {
      d: "M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/stamp.js
var Stamp = [
  ["path", { d: "M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13" }],
  [
    "path",
    {
      d: "M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z"
    }
  ],
  ["path", { d: "M5 22h14" }]
];

// node_modules/lucide/dist/esm/icons/star-half.js
var StarHalf = [
  [
    "path",
    {
      d: "M12 18.338a2.1 2.1 0 0 0-.987.244L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16l2.309-4.679A.53.53 0 0 1 12 2"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/star-off.js
var StarOff = [
  ["path", { d: "M8.34 8.34 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-.59-3.43" }],
  ["path", { d: "M18.42 12.76 22 9.27l-6.91-1L12 2l-1.44 2.91" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/star.js
var Star = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/step-back.js
var StepBack = [
  [
    "path",
    {
      d: "M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"
    }
  ],
  ["path", { d: "M21 20V4" }]
];

// node_modules/lucide/dist/esm/icons/step-forward.js
var StepForward = [
  [
    "path",
    { d: "M10.029 4.285A2 2 0 0 0 7 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" }
  ],
  ["path", { d: "M3 4v16" }]
];

// node_modules/lucide/dist/esm/icons/stethoscope.js
var Stethoscope = [
  ["path", { d: "M11 2v2" }],
  ["path", { d: "M5 2v2" }],
  ["path", { d: "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" }],
  ["path", { d: "M8 15a6 6 0 0 0 12 0v-3" }],
  ["circle", { cx: "20", cy: "10", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/sticker.js
var Sticker = [
  ["path", { d: "M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" }],
  ["path", { d: "M14 3v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M8 13h.01" }],
  ["path", { d: "M16 13h.01" }],
  ["path", { d: "M10 16s.8 1 2 1c1.3 0 2-1 2-1" }]
];

// node_modules/lucide/dist/esm/icons/sticky-note.js
var StickyNote = [
  ["path", { d: "M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" }],
  ["path", { d: "M15 3v4a2 2 0 0 0 2 2h4" }]
];

// node_modules/lucide/dist/esm/icons/store.js
var Store = [
  ["path", { d: "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" }],
  [
    "path",
    {
      d: "M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"
    }
  ],
  ["path", { d: "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" }]
];

// node_modules/lucide/dist/esm/icons/stretch-horizontal.js
var StretchHorizontal = [
  ["rect", { width: "20", height: "6", x: "2", y: "4", rx: "2" }],
  ["rect", { width: "20", height: "6", x: "2", y: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/stretch-vertical.js
var StretchVertical = [
  ["rect", { width: "6", height: "20", x: "4", y: "2", rx: "2" }],
  ["rect", { width: "6", height: "20", x: "14", y: "2", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/strikethrough.js
var Strikethrough = [
  ["path", { d: "M16 4H9a3 3 0 0 0-2.83 4" }],
  ["path", { d: "M14 12a4 4 0 0 1 0 8H6" }],
  ["line", { x1: "4", x2: "20", y1: "12", y2: "12" }]
];

// node_modules/lucide/dist/esm/icons/subscript.js
var Subscript = [
  ["path", { d: "m4 5 8 8" }],
  ["path", { d: "m12 5-8 8" }],
  [
    "path",
    {
      d: "M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/sun-dim.js
var SunDim = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 4h.01" }],
  ["path", { d: "M20 12h.01" }],
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M4 12h.01" }],
  ["path", { d: "M17.657 6.343h.01" }],
  ["path", { d: "M17.657 17.657h.01" }],
  ["path", { d: "M6.343 17.657h.01" }],
  ["path", { d: "M6.343 6.343h.01" }]
];

// node_modules/lucide/dist/esm/icons/sun-medium.js
var SunMedium = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 3v1" }],
  ["path", { d: "M12 20v1" }],
  ["path", { d: "M3 12h1" }],
  ["path", { d: "M20 12h1" }],
  ["path", { d: "m18.364 5.636-.707.707" }],
  ["path", { d: "m6.343 17.657-.707.707" }],
  ["path", { d: "m5.636 5.636.707.707" }],
  ["path", { d: "m17.657 17.657.707.707" }]
];

// node_modules/lucide/dist/esm/icons/sun-moon.js
var SunMoon = [
  ["path", { d: "M12 2v2" }],
  [
    "path",
    {
      d: "M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"
    }
  ],
  ["path", { d: "M16 12a4 4 0 0 0-4-4" }],
  ["path", { d: "m19 5-1.256 1.256" }],
  ["path", { d: "M20 12h2" }]
];

// node_modules/lucide/dist/esm/icons/sun-snow.js
var SunSnow = [
  ["path", { d: "M10 21v-1" }],
  ["path", { d: "M10 4V3" }],
  ["path", { d: "M10 9a3 3 0 0 0 0 6" }],
  ["path", { d: "m14 20 1.25-2.5L18 18" }],
  ["path", { d: "m14 4 1.25 2.5L18 6" }],
  ["path", { d: "m17 21-3-6 1.5-3H22" }],
  ["path", { d: "m17 3-3 6 1.5 3" }],
  ["path", { d: "M2 12h1" }],
  ["path", { d: "m20 10-1.5 2 1.5 2" }],
  ["path", { d: "m3.64 18.36.7-.7" }],
  ["path", { d: "m4.34 6.34-.7-.7" }]
];

// node_modules/lucide/dist/esm/icons/sun.js
var Sun = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "m17.66 17.66 1.41 1.41" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m6.34 17.66-1.41 1.41" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }]
];

// node_modules/lucide/dist/esm/icons/sunrise.js
var Sunrise = [
  ["path", { d: "M12 2v8" }],
  ["path", { d: "m4.93 10.93 1.41 1.41" }],
  ["path", { d: "M2 18h2" }],
  ["path", { d: "M20 18h2" }],
  ["path", { d: "m19.07 10.93-1.41 1.41" }],
  ["path", { d: "M22 22H2" }],
  ["path", { d: "m8 6 4-4 4 4" }],
  ["path", { d: "M16 18a4 4 0 0 0-8 0" }]
];

// node_modules/lucide/dist/esm/icons/sunset.js
var Sunset = [
  ["path", { d: "M12 10V2" }],
  ["path", { d: "m4.93 10.93 1.41 1.41" }],
  ["path", { d: "M2 18h2" }],
  ["path", { d: "M20 18h2" }],
  ["path", { d: "m19.07 10.93-1.41 1.41" }],
  ["path", { d: "M22 22H2" }],
  ["path", { d: "m16 6-4 4-4-4" }],
  ["path", { d: "M16 18a4 4 0 0 0-8 0" }]
];

// node_modules/lucide/dist/esm/icons/superscript.js
var Superscript = [
  ["path", { d: "m4 19 8-8" }],
  ["path", { d: "m12 19-8-8" }],
  [
    "path",
    {
      d: "M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/swatch-book.js
var SwatchBook = [
  ["path", { d: "M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z" }],
  ["path", { d: "M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7" }],
  ["path", { d: "M 7 17h.01" }],
  [
    "path",
    { d: "m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8" }
  ]
];

// node_modules/lucide/dist/esm/icons/swiss-franc.js
var SwissFranc = [
  ["path", { d: "M10 21V3h8" }],
  ["path", { d: "M6 16h9" }],
  ["path", { d: "M10 9.5h7" }]
];

// node_modules/lucide/dist/esm/icons/switch-camera.js
var SwitchCamera = [
  ["path", { d: "M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" }],
  ["path", { d: "M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "m18 22-3-3 3-3" }],
  ["path", { d: "m6 2 3 3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/sword.js
var Sword = [
  ["path", { d: "m11 19-6-6" }],
  ["path", { d: "m5 21-2-2" }],
  ["path", { d: "m8 16-4 4" }],
  ["path", { d: "M9.5 17.5 21 6V3h-3L6.5 14.5" }]
];

// node_modules/lucide/dist/esm/icons/swords.js
var Swords = [
  ["polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }],
  ["line", { x1: "13", x2: "19", y1: "19", y2: "13" }],
  ["line", { x1: "16", x2: "20", y1: "16", y2: "20" }],
  ["line", { x1: "19", x2: "21", y1: "21", y2: "19" }],
  ["polyline", { points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5" }],
  ["line", { x1: "5", x2: "9", y1: "14", y2: "18" }],
  ["line", { x1: "7", x2: "4", y1: "17", y2: "20" }],
  ["line", { x1: "3", x2: "5", y1: "19", y2: "21" }]
];

// node_modules/lucide/dist/esm/icons/syringe.js
var Syringe = [
  ["path", { d: "m18 2 4 4" }],
  ["path", { d: "m17 7 3-3" }],
  ["path", { d: "M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" }],
  ["path", { d: "m9 11 4 4" }],
  ["path", { d: "m5 19-3 3" }],
  ["path", { d: "m14 4 6 6" }]
];

// node_modules/lucide/dist/esm/icons/table-2.js
var Table2 = [
  [
    "path",
    {
      d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/table-cells-merge.js
var TableCellsMerge = [
  ["path", { d: "M12 21v-6" }],
  ["path", { d: "M12 9V3" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "M3 9h18" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/table-cells-split.js
var TableCellsSplit = [
  ["path", { d: "M12 15V9" }],
  ["path", { d: "M3 15h18" }],
  ["path", { d: "M3 9h18" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/table-columns-split.js
var TableColumnsSplit = [
  ["path", { d: "M14 14v2" }],
  ["path", { d: "M14 20v2" }],
  ["path", { d: "M14 2v2" }],
  ["path", { d: "M14 8v2" }],
  ["path", { d: "M2 15h8" }],
  ["path", { d: "M2 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2" }],
  ["path", { d: "M2 9h8" }],
  ["path", { d: "M22 15h-4" }],
  ["path", { d: "M22 3h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2" }],
  ["path", { d: "M22 9h-4" }],
  ["path", { d: "M5 3v18" }]
];

// node_modules/lucide/dist/esm/icons/table-of-contents.js
var TableOfContents = [
  ["path", { d: "M16 5H3" }],
  ["path", { d: "M16 12H3" }],
  ["path", { d: "M16 19H3" }],
  ["path", { d: "M21 5h.01" }],
  ["path", { d: "M21 12h.01" }],
  ["path", { d: "M21 19h.01" }]
];

// node_modules/lucide/dist/esm/icons/table-properties.js
var TableProperties = [
  ["path", { d: "M15 3v18" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M21 9H3" }],
  ["path", { d: "M21 15H3" }]
];

// node_modules/lucide/dist/esm/icons/table-rows-split.js
var TableRowsSplit = [
  ["path", { d: "M14 10h2" }],
  ["path", { d: "M15 22v-8" }],
  ["path", { d: "M15 2v4" }],
  ["path", { d: "M2 10h2" }],
  ["path", { d: "M20 10h2" }],
  ["path", { d: "M3 19h18" }],
  ["path", { d: "M3 22v-6a2 2 135 0 1 2-2h14a2 2 45 0 1 2 2v6" }],
  ["path", { d: "M3 2v2a2 2 45 0 0 2 2h14a2 2 135 0 0 2-2V2" }],
  ["path", { d: "M8 10h2" }],
  ["path", { d: "M9 22v-8" }],
  ["path", { d: "M9 2v4" }]
];

// node_modules/lucide/dist/esm/icons/table.js
var Table = [
  ["path", { d: "M12 3v18" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9h18" }],
  ["path", { d: "M3 15h18" }]
];

// node_modules/lucide/dist/esm/icons/tablet-smartphone.js
var TabletSmartphone = [
  ["rect", { width: "10", height: "14", x: "3", y: "8", rx: "2" }],
  ["path", { d: "M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4" }],
  ["path", { d: "M8 18h.01" }]
];

// node_modules/lucide/dist/esm/icons/tablet.js
var Tablet = [
  ["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2", ry: "2" }],
  ["line", { x1: "12", x2: "12.01", y1: "18", y2: "18" }]
];

// node_modules/lucide/dist/esm/icons/tablets.js
var Tablets = [
  ["circle", { cx: "7", cy: "7", r: "5" }],
  ["circle", { cx: "17", cy: "17", r: "5" }],
  ["path", { d: "M12 17h10" }],
  ["path", { d: "m3.46 10.54 7.08-7.08" }]
];

// node_modules/lucide/dist/esm/icons/tag.js
var Tag = [
  [
    "path",
    {
      d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
    }
  ],
  ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }]
];

// node_modules/lucide/dist/esm/icons/tags.js
var Tags = [
  [
    "path",
    {
      d: "M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z"
    }
  ],
  ["path", { d: "M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193" }],
  ["circle", { cx: "10.5", cy: "6.5", r: ".5", fill: "currentColor" }]
];

// node_modules/lucide/dist/esm/icons/tally-1.js
var Tally1 = [["path", { d: "M4 4v16" }]];

// node_modules/lucide/dist/esm/icons/tally-2.js
var Tally2 = [
  ["path", { d: "M4 4v16" }],
  ["path", { d: "M9 4v16" }]
];

// node_modules/lucide/dist/esm/icons/tally-3.js
var Tally3 = [
  ["path", { d: "M4 4v16" }],
  ["path", { d: "M9 4v16" }],
  ["path", { d: "M14 4v16" }]
];

// node_modules/lucide/dist/esm/icons/tally-4.js
var Tally4 = [
  ["path", { d: "M4 4v16" }],
  ["path", { d: "M9 4v16" }],
  ["path", { d: "M14 4v16" }],
  ["path", { d: "M19 4v16" }]
];

// node_modules/lucide/dist/esm/icons/tally-5.js
var Tally5 = [
  ["path", { d: "M4 4v16" }],
  ["path", { d: "M9 4v16" }],
  ["path", { d: "M14 4v16" }],
  ["path", { d: "M19 4v16" }],
  ["path", { d: "M22 6 2 18" }]
];

// node_modules/lucide/dist/esm/icons/target.js
var Target = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["circle", { cx: "12", cy: "12", r: "6" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/tangent.js
var Tangent = [
  ["circle", { cx: "17", cy: "4", r: "2" }],
  ["path", { d: "M15.59 5.41 5.41 15.59" }],
  ["circle", { cx: "4", cy: "17", r: "2" }],
  ["path", { d: "M12 22s-4-9-1.5-11.5S22 12 22 12" }]
];

// node_modules/lucide/dist/esm/icons/telescope.js
var Telescope = [
  [
    "path",
    {
      d: "m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"
    }
  ],
  ["path", { d: "m13.56 11.747 4.332-.924" }],
  ["path", { d: "m16 21-3.105-6.21" }],
  [
    "path",
    {
      d: "M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"
    }
  ],
  ["path", { d: "m6.158 8.633 1.114 4.456" }],
  ["path", { d: "m8 21 3.105-6.21" }],
  ["circle", { cx: "12", cy: "13", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/tent-tree.js
var TentTree = [
  ["circle", { cx: "4", cy: "4", r: "2" }],
  ["path", { d: "m14 5 3-3 3 3" }],
  ["path", { d: "m14 10 3-3 3 3" }],
  ["path", { d: "M17 14V2" }],
  ["path", { d: "M17 14H7l-5 8h20Z" }],
  ["path", { d: "M8 14v8" }],
  ["path", { d: "m9 14 5 8" }]
];

// node_modules/lucide/dist/esm/icons/tent.js
var Tent = [
  ["path", { d: "M3.5 21 14 3" }],
  ["path", { d: "M20.5 21 10 3" }],
  ["path", { d: "M15.5 21 12 15l-3.5 6" }],
  ["path", { d: "M2 21h20" }]
];

// node_modules/lucide/dist/esm/icons/terminal.js
var Terminal = [
  ["path", { d: "M12 19h8" }],
  ["path", { d: "m4 17 6-6-6-6" }]
];

// node_modules/lucide/dist/esm/icons/test-tube-diagonal.js
var TestTubeDiagonal = [
  ["path", { d: "M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01a2.83 2.83 0 0 1 0-4L17 3" }],
  ["path", { d: "m16 2 6 6" }],
  ["path", { d: "M12 16H4" }]
];

// node_modules/lucide/dist/esm/icons/test-tubes.js
var TestTubes = [
  ["path", { d: "M9 2v17.5A2.5 2.5 0 0 1 6.5 22A2.5 2.5 0 0 1 4 19.5V2" }],
  ["path", { d: "M20 2v17.5a2.5 2.5 0 0 1-2.5 2.5a2.5 2.5 0 0 1-2.5-2.5V2" }],
  ["path", { d: "M3 2h7" }],
  ["path", { d: "M14 2h7" }],
  ["path", { d: "M9 16H4" }],
  ["path", { d: "M20 16h-5" }]
];

// node_modules/lucide/dist/esm/icons/test-tube.js
var TestTube = [
  ["path", { d: "M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2" }],
  ["path", { d: "M8.5 2h7" }],
  ["path", { d: "M14.5 16h-5" }]
];

// node_modules/lucide/dist/esm/icons/text-align-center.js
var TextAlignCenter = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M17 12H7" }],
  ["path", { d: "M19 19H5" }]
];

// node_modules/lucide/dist/esm/icons/text-align-justify.js
var TextAlignJustify = [
  ["path", { d: "M3 5h18" }],
  ["path", { d: "M3 12h18" }],
  ["path", { d: "M3 19h18" }]
];

// node_modules/lucide/dist/esm/icons/text-align-end.js
var TextAlignEnd = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M21 12H9" }],
  ["path", { d: "M21 19H7" }]
];

// node_modules/lucide/dist/esm/icons/text-align-start.js
var TextAlignStart = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M15 12H3" }],
  ["path", { d: "M17 19H3" }]
];

// node_modules/lucide/dist/esm/icons/text-cursor-input.js
var TextCursorInput = [
  ["path", { d: "M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6" }],
  ["path", { d: "M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7" }],
  ["path", { d: "M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1" }],
  ["path", { d: "M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1" }],
  ["path", { d: "M9 6v12" }]
];

// node_modules/lucide/dist/esm/icons/text-initial.js
var TextInitial = [
  ["path", { d: "M15 5h6" }],
  ["path", { d: "M15 12h6" }],
  ["path", { d: "M3 19h18" }],
  ["path", { d: "m3 12 3.553-7.724a.5.5 0 0 1 .894 0L11 12" }],
  ["path", { d: "M3.92 10h6.16" }]
];

// node_modules/lucide/dist/esm/icons/text-cursor.js
var TextCursor = [
  ["path", { d: "M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1" }],
  ["path", { d: "M7 22h1a4 4 0 0 0 4-4v-1" }],
  ["path", { d: "M7 2h1a4 4 0 0 1 4 4v1" }]
];

// node_modules/lucide/dist/esm/icons/text-quote.js
var TextQuote = [
  ["path", { d: "M17 5H3" }],
  ["path", { d: "M21 12H8" }],
  ["path", { d: "M21 19H8" }],
  ["path", { d: "M3 12v7" }]
];

// node_modules/lucide/dist/esm/icons/text-search.js
var TextSearch = [
  ["path", { d: "M21 5H3" }],
  ["path", { d: "M10 12H3" }],
  ["path", { d: "M10 19H3" }],
  ["circle", { cx: "17", cy: "15", r: "3" }],
  ["path", { d: "m21 19-1.9-1.9" }]
];

// node_modules/lucide/dist/esm/icons/text-select.js
var TextSelect = [
  ["path", { d: "M14 21h1" }],
  ["path", { d: "M14 3h1" }],
  ["path", { d: "M19 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M21 14v1" }],
  ["path", { d: "M21 19a2 2 0 0 1-2 2" }],
  ["path", { d: "M21 9v1" }],
  ["path", { d: "M3 14v1" }],
  ["path", { d: "M3 9v1" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M5 3a2 2 0 0 0-2 2" }],
  ["path", { d: "M7 12h10" }],
  ["path", { d: "M7 16h6" }],
  ["path", { d: "M7 8h8" }],
  ["path", { d: "M9 21h1" }],
  ["path", { d: "M9 3h1" }]
];

// node_modules/lucide/dist/esm/icons/text-wrap.js
var TextWrap = [
  ["path", { d: "m16 16-3 3 3 3" }],
  ["path", { d: "M3 12h14.5a1 1 0 0 1 0 7H13" }],
  ["path", { d: "M3 19h6" }],
  ["path", { d: "M3 5h18" }]
];

// node_modules/lucide/dist/esm/icons/theater.js
var Theater = [
  ["path", { d: "M2 10s3-3 3-8" }],
  ["path", { d: "M22 10s-3-3-3-8" }],
  ["path", { d: "M10 2c0 4.4-3.6 8-8 8" }],
  ["path", { d: "M14 2c0 4.4 3.6 8 8 8" }],
  ["path", { d: "M2 10s2 2 2 5" }],
  ["path", { d: "M22 10s-2 2-2 5" }],
  ["path", { d: "M8 15h8" }],
  ["path", { d: "M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" }],
  ["path", { d: "M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" }]
];

// node_modules/lucide/dist/esm/icons/thermometer-snowflake.js
var ThermometerSnowflake = [
  ["path", { d: "m10 20-1.25-2.5L6 18" }],
  ["path", { d: "M10 4 8.75 6.5 6 6" }],
  ["path", { d: "M10.585 15H10" }],
  ["path", { d: "M2 12h6.5L10 9" }],
  ["path", { d: "M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" }],
  ["path", { d: "m4 10 1.5 2L4 14" }],
  ["path", { d: "m7 21 3-6-1.5-3" }],
  ["path", { d: "m7 3 3 6h2" }]
];

// node_modules/lucide/dist/esm/icons/thermometer-sun.js
var ThermometerSun = [
  ["path", { d: "M12 9a4 4 0 0 0-2 7.5" }],
  ["path", { d: "M12 3v2" }],
  ["path", { d: "m6.6 18.4-1.4 1.4" }],
  ["path", { d: "M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" }],
  ["path", { d: "M4 13H2" }],
  ["path", { d: "M6.34 7.34 4.93 5.93" }]
];

// node_modules/lucide/dist/esm/icons/thermometer.js
var Thermometer = [["path", { d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" }]];

// node_modules/lucide/dist/esm/icons/thumbs-down.js
var ThumbsDown = [
  ["path", { d: "M17 14V2" }],
  [
    "path",
    {
      d: "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/thumbs-up.js
var ThumbsUp = [
  ["path", { d: "M7 10v12" }],
  [
    "path",
    {
      d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/ticket-check.js
var TicketCheck = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "m9 12 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/ticket-minus.js
var TicketMinus = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "M9 12h6" }]
];

// node_modules/lucide/dist/esm/icons/ticket-percent.js
var TicketPercent = [
  [
    "path",
    {
      d: "M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "M9 9h.01" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "M15 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/ticket-plus.js
var TicketPlus = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "M9 12h6" }],
  ["path", { d: "M12 9v6" }]
];

// node_modules/lucide/dist/esm/icons/ticket-slash.js
var TicketSlash = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "m9.5 14.5 5-5" }]
];

// node_modules/lucide/dist/esm/icons/ticket-x.js
var TicketX = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "m9.5 14.5 5-5" }],
  ["path", { d: "m9.5 9.5 5 5" }]
];

// node_modules/lucide/dist/esm/icons/ticket.js
var Ticket = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
    }
  ],
  ["path", { d: "M13 5v2" }],
  ["path", { d: "M13 17v2" }],
  ["path", { d: "M13 11v2" }]
];

// node_modules/lucide/dist/esm/icons/tickets-plane.js
var TicketsPlane = [
  ["path", { d: "M10.5 17h1.227a2 2 0 0 0 1.345-.52L18 12" }],
  ["path", { d: "m12 13.5 3.75.5" }],
  ["path", { d: "m4.5 8 10.58-5.06a1 1 0 0 1 1.342.488L18.5 8" }],
  ["path", { d: "M6 10V8" }],
  ["path", { d: "M6 14v1" }],
  ["path", { d: "M6 19v2" }],
  ["rect", { x: "2", y: "8", width: "20", height: "13", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/tickets.js
var Tickets = [
  ["path", { d: "m4.5 8 10.58-5.06a1 1 0 0 1 1.342.488L18.5 8" }],
  ["path", { d: "M6 10V8" }],
  ["path", { d: "M6 14v1" }],
  ["path", { d: "M6 19v2" }],
  ["rect", { x: "2", y: "8", width: "20", height: "13", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/timer-off.js
var TimerOff = [
  ["path", { d: "M10 2h4" }],
  ["path", { d: "M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7" }],
  ["path", { d: "M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M12 12v-2" }]
];

// node_modules/lucide/dist/esm/icons/timer-reset.js
var TimerReset = [
  ["path", { d: "M10 2h4" }],
  ["path", { d: "M12 14v-4" }],
  ["path", { d: "M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6" }],
  ["path", { d: "M9 17H4v5" }]
];

// node_modules/lucide/dist/esm/icons/timer.js
var Timer = [
  ["line", { x1: "10", x2: "14", y1: "2", y2: "2" }],
  ["line", { x1: "12", x2: "15", y1: "14", y2: "11" }],
  ["circle", { cx: "12", cy: "14", r: "8" }]
];

// node_modules/lucide/dist/esm/icons/toggle-left.js
var ToggleLeft = [
  ["circle", { cx: "9", cy: "12", r: "3" }],
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "7" }]
];

// node_modules/lucide/dist/esm/icons/toggle-right.js
var ToggleRight = [
  ["circle", { cx: "15", cy: "12", r: "3" }],
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "7" }]
];

// node_modules/lucide/dist/esm/icons/toilet.js
var Toilet = [
  [
    "path",
    {
      d: "M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"
    }
  ],
  ["path", { d: "M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" }]
];

// node_modules/lucide/dist/esm/icons/tool-case.js
var ToolCase = [
  ["path", { d: "M10 15h4" }],
  [
    "path",
    {
      d: "m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27"
    }
  ],
  [
    "path",
    {
      d: "m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122"
    }
  ],
  ["path", { d: "M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" }]
];

// node_modules/lucide/dist/esm/icons/tornado.js
var Tornado = [
  ["path", { d: "M21 4H3" }],
  ["path", { d: "M18 8H6" }],
  ["path", { d: "M19 12H9" }],
  ["path", { d: "M16 16h-6" }],
  ["path", { d: "M11 20H9" }]
];

// node_modules/lucide/dist/esm/icons/touchpad-off.js
var TouchpadOff = [
  ["path", { d: "M12 20v-6" }],
  ["path", { d: "M19.656 14H22" }],
  ["path", { d: "M2 14h12" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" }],
  ["path", { d: "M9.656 4H20a2 2 0 0 1 2 2v10.344" }]
];

// node_modules/lucide/dist/esm/icons/touchpad.js
var Touchpad = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M2 14h20" }],
  ["path", { d: "M12 20v-6" }]
];

// node_modules/lucide/dist/esm/icons/torus.js
var Torus = [
  ["ellipse", { cx: "12", cy: "11", rx: "3", ry: "2" }],
  ["ellipse", { cx: "12", cy: "12.5", rx: "10", ry: "8.5" }]
];

// node_modules/lucide/dist/esm/icons/tower-control.js
var TowerControl = [
  ["path", { d: "M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z" }],
  ["path", { d: "M8 13v9" }],
  ["path", { d: "M16 22v-9" }],
  ["path", { d: "m9 6 1 7" }],
  ["path", { d: "m15 6-1 7" }],
  ["path", { d: "M12 6V2" }],
  ["path", { d: "M13 2h-2" }]
];

// node_modules/lucide/dist/esm/icons/toy-brick.js
var ToyBrick = [
  ["rect", { width: "18", height: "12", x: "3", y: "8", rx: "1" }],
  ["path", { d: "M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3" }],
  ["path", { d: "M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3" }]
];

// node_modules/lucide/dist/esm/icons/tractor.js
var Tractor = [
  ["path", { d: "m10 11 11 .9a1 1 0 0 1 .8 1.1l-.665 4.158a1 1 0 0 1-.988.842H20" }],
  ["path", { d: "M16 18h-5" }],
  ["path", { d: "M18 5a1 1 0 0 0-1 1v5.573" }],
  ["path", { d: "M3 4h8.129a1 1 0 0 1 .99.863L13 11.246" }],
  ["path", { d: "M4 11V4" }],
  ["path", { d: "M7 15h.01" }],
  ["path", { d: "M8 10.1V4" }],
  ["circle", { cx: "18", cy: "18", r: "2" }],
  ["circle", { cx: "7", cy: "15", r: "5" }]
];

// node_modules/lucide/dist/esm/icons/traffic-cone.js
var TrafficCone = [
  ["path", { d: "M16.05 10.966a5 2.5 0 0 1-8.1 0" }],
  [
    "path",
    {
      d: "m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"
    }
  ],
  ["path", { d: "M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z" }],
  ["path", { d: "M9.194 6.57a5 2.5 0 0 0 5.61 0" }]
];

// node_modules/lucide/dist/esm/icons/train-front.js
var TrainFront = [
  ["path", { d: "M8 3.1V7a4 4 0 0 0 8 0V3.1" }],
  ["path", { d: "m9 15-1-1" }],
  ["path", { d: "m15 15 1-1" }],
  ["path", { d: "M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" }],
  ["path", { d: "m8 19-2 3" }],
  ["path", { d: "m16 19 2 3" }]
];

// node_modules/lucide/dist/esm/icons/train-front-tunnel.js
var TrainFrontTunnel = [
  ["path", { d: "M2 22V12a10 10 0 1 1 20 0v10" }],
  ["path", { d: "M15 6.8v1.4a3 2.8 0 1 1-6 0V6.8" }],
  ["path", { d: "M10 15h.01" }],
  ["path", { d: "M14 15h.01" }],
  ["path", { d: "M10 19a4 4 0 0 1-4-4v-3a6 6 0 1 1 12 0v3a4 4 0 0 1-4 4Z" }],
  ["path", { d: "m9 19-2 3" }],
  ["path", { d: "m15 19 2 3" }]
];

// node_modules/lucide/dist/esm/icons/tram-front.js
var TramFront = [
  ["rect", { width: "16", height: "16", x: "4", y: "3", rx: "2" }],
  ["path", { d: "M4 11h16" }],
  ["path", { d: "M12 3v8" }],
  ["path", { d: "m8 19-2 3" }],
  ["path", { d: "m18 22-2-3" }],
  ["path", { d: "M8 15h.01" }],
  ["path", { d: "M16 15h.01" }]
];

// node_modules/lucide/dist/esm/icons/train-track.js
var TrainTrack = [
  ["path", { d: "M2 17 17 2" }],
  ["path", { d: "m2 14 8 8" }],
  ["path", { d: "m5 11 8 8" }],
  ["path", { d: "m8 8 8 8" }],
  ["path", { d: "m11 5 8 8" }],
  ["path", { d: "m14 2 8 8" }],
  ["path", { d: "M7 22 22 7" }]
];

// node_modules/lucide/dist/esm/icons/transgender.js
var Transgender = [
  ["path", { d: "M12 16v6" }],
  ["path", { d: "M14 20h-4" }],
  ["path", { d: "M18 2h4v4" }],
  ["path", { d: "m2 2 7.17 7.17" }],
  ["path", { d: "M2 5.355V2h3.357" }],
  ["path", { d: "m22 2-7.17 7.17" }],
  ["path", { d: "M8 5 5 8" }],
  ["circle", { cx: "12", cy: "12", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/trash-2.js
var Trash2 = [
  ["path", { d: "M10 11v6" }],
  ["path", { d: "M14 11v6" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]
];

// node_modules/lucide/dist/esm/icons/trash.js
var Trash = [
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]
];

// node_modules/lucide/dist/esm/icons/tree-deciduous.js
var TreeDeciduous = [
  [
    "path",
    {
      d: "M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"
    }
  ],
  ["path", { d: "M12 19v3" }]
];

// node_modules/lucide/dist/esm/icons/tree-palm.js
var TreePalm = [
  ["path", { d: "M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" }],
  ["path", { d: "M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" }],
  [
    "path",
    {
      d: "M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"
    }
  ],
  ["path", { d: "M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14" }]
];

// node_modules/lucide/dist/esm/icons/tree-pine.js
var TreePine = [
  [
    "path",
    {
      d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"
    }
  ],
  ["path", { d: "M12 22v-3" }]
];

// node_modules/lucide/dist/esm/icons/trees.js
var Trees = [
  ["path", { d: "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" }],
  ["path", { d: "M7 16v6" }],
  ["path", { d: "M13 19v3" }],
  [
    "path",
    {
      d: "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/trending-down.js
var TrendingDown = [
  ["path", { d: "M16 17h6v-6" }],
  ["path", { d: "m22 17-8.5-8.5-5 5L2 7" }]
];

// node_modules/lucide/dist/esm/icons/trello.js
var Trello = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }],
  ["rect", { width: "3", height: "9", x: "7", y: "7" }],
  ["rect", { width: "3", height: "5", x: "14", y: "7" }]
];

// node_modules/lucide/dist/esm/icons/trending-up-down.js
var TrendingUpDown = [
  ["path", { d: "M14.828 14.828 21 21" }],
  ["path", { d: "M21 16v5h-5" }],
  ["path", { d: "m21 3-9 9-4-4-6 6" }],
  ["path", { d: "M21 8V3h-5" }]
];

// node_modules/lucide/dist/esm/icons/trending-up.js
var TrendingUp = [
  ["path", { d: "M16 7h6v6" }],
  ["path", { d: "m22 7-8.5 8.5-5-5L2 17" }]
];

// node_modules/lucide/dist/esm/icons/triangle-alert.js
var TriangleAlert = [
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }]
];

// node_modules/lucide/dist/esm/icons/triangle-dashed.js
var TriangleDashed = [
  ["path", { d: "M10.17 4.193a2 2 0 0 1 3.666.013" }],
  ["path", { d: "M14 21h2" }],
  ["path", { d: "m15.874 7.743 1 1.732" }],
  ["path", { d: "m18.849 12.952 1 1.732" }],
  ["path", { d: "M21.824 18.18a2 2 0 0 1-1.835 2.824" }],
  ["path", { d: "M4.024 21a2 2 0 0 1-1.839-2.839" }],
  ["path", { d: "m5.136 12.952-1 1.732" }],
  ["path", { d: "M8 21h2" }],
  ["path", { d: "m8.102 7.743-1 1.732" }]
];

// node_modules/lucide/dist/esm/icons/triangle.js
var Triangle = [
  ["path", { d: "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }]
];

// node_modules/lucide/dist/esm/icons/triangle-right.js
var TriangleRight = [
  ["path", { d: "M22 18a2 2 0 0 1-2 2H3c-1.1 0-1.3-.6-.4-1.3L20.4 4.3c.9-.7 1.6-.4 1.6.7Z" }]
];

// node_modules/lucide/dist/esm/icons/trophy.js
var Trophy = [
  ["path", { d: "M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" }],
  ["path", { d: "M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" }],
  ["path", { d: "M18 9h1.5a1 1 0 0 0 0-5H18" }],
  ["path", { d: "M4 22h16" }],
  ["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" }],
  ["path", { d: "M6 9H4.5a1 1 0 0 1 0-5H6" }]
];

// node_modules/lucide/dist/esm/icons/truck-electric.js
var TruckElectric = [
  ["path", { d: "M14 19V7a2 2 0 0 0-2-2H9" }],
  ["path", { d: "M15 19H9" }],
  ["path", { d: "M19 19h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14" }],
  ["path", { d: "M2 13v5a1 1 0 0 0 1 1h2" }],
  ["path", { d: "M4 3 2.15 5.15a.495.495 0 0 0 .35.86h2.15a.47.47 0 0 1 .35.86L3 9.02" }],
  ["circle", { cx: "17", cy: "19", r: "2" }],
  ["circle", { cx: "7", cy: "19", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/truck.js
var Truck = [
  ["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }],
  ["path", { d: "M15 18H9" }],
  [
    "path",
    { d: "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" }
  ],
  ["circle", { cx: "17", cy: "18", r: "2" }],
  ["circle", { cx: "7", cy: "18", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/turkish-lira.js
var TurkishLira = [
  ["path", { d: "M15 4 5 9" }],
  ["path", { d: "m15 8.5-10 5" }],
  ["path", { d: "M18 12a9 9 0 0 1-9 9V3" }]
];

// node_modules/lucide/dist/esm/icons/turntable.js
var Turntable = [
  ["path", { d: "M10 12.01h.01" }],
  ["path", { d: "M18 8v4a8 8 0 0 1-1.07 4" }],
  ["circle", { cx: "10", cy: "12", r: "4" }],
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/turtle.js
var Turtle = [
  [
    "path",
    {
      d: "m12 10 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a8 8 0 1 0-16 0v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3l2-4h4Z"
    }
  ],
  ["path", { d: "M4.82 7.9 8 10" }],
  ["path", { d: "M15.18 7.9 12 10" }],
  ["path", { d: "M16.93 10H20a2 2 0 0 1 0 4H2" }]
];

// node_modules/lucide/dist/esm/icons/tv-minimal-play.js
var TvMinimalPlay = [
  [
    "path",
    {
      d: "M15.033 9.44a.647.647 0 0 1 0 1.12l-4.065 2.352a.645.645 0 0 1-.968-.56V7.648a.645.645 0 0 1 .967-.56z"
    }
  ],
  ["path", { d: "M7 21h10" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/tv-minimal.js
var TvMinimal = [
  ["path", { d: "M7 21h10" }],
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/twitch.js
var Twitch = [["path", { d: "M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" }]];

// node_modules/lucide/dist/esm/icons/tv.js
var Tv = [
  ["path", { d: "m17 2-5 5-5-5" }],
  ["rect", { width: "20", height: "15", x: "2", y: "7", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/twitter.js
var Twitter = [
  [
    "path",
    {
      d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/type-outline.js
var TypeOutline = [
  [
    "path",
    {
      d: "M14 16.5a.5.5 0 0 0 .5.5h.5a2 2 0 0 1 0 4H9a2 2 0 0 1 0-4h.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V8a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-4 0v-.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/type.js
var Type = [
  ["path", { d: "M12 4v16" }],
  ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }],
  ["path", { d: "M9 20h6" }]
];

// node_modules/lucide/dist/esm/icons/umbrella-off.js
var UmbrellaOff = [
  ["path", { d: "M12 13v7a2 2 0 0 0 4 0" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M18.656 13h2.336a1 1 0 0 0 .97-1.274 10.284 10.284 0 0 0-12.07-7.51" }],
  ["path", { d: "m2 2 20 20" }],
  ["path", { d: "M5.961 5.957a10.28 10.28 0 0 0-3.922 5.769A1 1 0 0 0 3 13h10" }]
];

// node_modules/lucide/dist/esm/icons/umbrella.js
var Umbrella = [
  ["path", { d: "M12 13v7a2 2 0 0 0 4 0" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M20.992 13a1 1 0 0 0 .97-1.274 10.284 10.284 0 0 0-19.923 0A1 1 0 0 0 3 13z" }]
];

// node_modules/lucide/dist/esm/icons/underline.js
var Underline = [
  ["path", { d: "M6 4v6a6 6 0 0 0 12 0V4" }],
  ["line", { x1: "4", x2: "20", y1: "20", y2: "20" }]
];

// node_modules/lucide/dist/esm/icons/undo-2.js
var Undo2 = [
  ["path", { d: "M9 14 4 9l5-5" }],
  ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]
];

// node_modules/lucide/dist/esm/icons/undo.js
var Undo = [
  ["path", { d: "M3 7v6h6" }],
  ["path", { d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" }]
];

// node_modules/lucide/dist/esm/icons/undo-dot.js
var UndoDot = [
  ["path", { d: "M21 17a9 9 0 0 0-15-6.7L3 13" }],
  ["path", { d: "M3 7v6h6" }],
  ["circle", { cx: "12", cy: "17", r: "1" }]
];

// node_modules/lucide/dist/esm/icons/unfold-horizontal.js
var UnfoldHorizontal = [
  ["path", { d: "M16 12h6" }],
  ["path", { d: "M8 12H2" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 8v2" }],
  ["path", { d: "M12 14v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m19 15 3-3-3-3" }],
  ["path", { d: "m5 9-3 3 3 3" }]
];

// node_modules/lucide/dist/esm/icons/unfold-vertical.js
var UnfoldVertical = [
  ["path", { d: "M12 22v-6" }],
  ["path", { d: "M12 8V2" }],
  ["path", { d: "M4 12H2" }],
  ["path", { d: "M10 12H8" }],
  ["path", { d: "M16 12h-2" }],
  ["path", { d: "M22 12h-2" }],
  ["path", { d: "m15 19-3 3-3-3" }],
  ["path", { d: "m15 5-3-3-3 3" }]
];

// node_modules/lucide/dist/esm/icons/ungroup.js
var Ungroup = [
  ["rect", { width: "8", height: "6", x: "5", y: "4", rx: "1" }],
  ["rect", { width: "8", height: "6", x: "11", y: "14", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/university.js
var University = [
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
  ["path", { d: "M18 12h.01" }],
  ["path", { d: "M18 16h.01" }],
  [
    "path",
    {
      d: "M22 7a1 1 0 0 0-1-1h-2a2 2 0 0 1-1.143-.359L13.143 2.36a2 2 0 0 0-2.286-.001L6.143 5.64A2 2 0 0 1 5 6H3a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z"
    }
  ],
  ["path", { d: "M6 12h.01" }],
  ["path", { d: "M6 16h.01" }],
  ["circle", { cx: "12", cy: "10", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/unlink-2.js
var Unlink2 = [["path", { d: "M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2" }]];

// node_modules/lucide/dist/esm/icons/unlink.js
var Unlink = [
  [
    "path",
    {
      d: "m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"
    }
  ],
  [
    "path",
    { d: "m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" }
  ],
  ["line", { x1: "8", x2: "8", y1: "2", y2: "5" }],
  ["line", { x1: "2", x2: "5", y1: "8", y2: "8" }],
  ["line", { x1: "16", x2: "16", y1: "19", y2: "22" }],
  ["line", { x1: "19", x2: "22", y1: "16", y2: "16" }]
];

// node_modules/lucide/dist/esm/icons/upload.js
var Upload = [
  ["path", { d: "M12 3v12" }],
  ["path", { d: "m17 8-5-5-5 5" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }]
];

// node_modules/lucide/dist/esm/icons/unplug.js
var Unplug = [
  ["path", { d: "m19 5 3-3" }],
  ["path", { d: "m2 22 3-3" }],
  ["path", { d: "M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" }],
  ["path", { d: "M7.5 13.5 10 11" }],
  ["path", { d: "M10.5 16.5 13 14" }],
  ["path", { d: "m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" }]
];

// node_modules/lucide/dist/esm/icons/user-check.js
var UserCheck = [
  ["path", { d: "m16 11 2 2 4-4" }],
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "9", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/usb.js
var Usb = [
  ["circle", { cx: "10", cy: "7", r: "1" }],
  ["circle", { cx: "4", cy: "20", r: "1" }],
  ["path", { d: "M4.7 19.3 19 5" }],
  ["path", { d: "m21 3-3 1 2 2Z" }],
  ["path", { d: "M9.26 7.68 5 12l2 5" }],
  ["path", { d: "m10 14 5 2 3.5-3.5" }],
  ["path", { d: "m18 12 1-1 1 1-1 1Z" }]
];

// node_modules/lucide/dist/esm/icons/user-cog.js
var UserCog = [
  ["path", { d: "M10 15H6a4 4 0 0 0-4 4v2" }],
  ["path", { d: "m14.305 16.53.923-.382" }],
  ["path", { d: "m15.228 13.852-.923-.383" }],
  ["path", { d: "m16.852 12.228-.383-.923" }],
  ["path", { d: "m16.852 17.772-.383.924" }],
  ["path", { d: "m19.148 12.228.383-.923" }],
  ["path", { d: "m19.53 18.696-.382-.924" }],
  ["path", { d: "m20.772 13.852.924-.383" }],
  ["path", { d: "m20.772 16.148.924.383" }],
  ["circle", { cx: "18", cy: "15", r: "3" }],
  ["circle", { cx: "9", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/user-lock.js
var UserLock = [
  ["circle", { cx: "10", cy: "7", r: "4" }],
  ["path", { d: "M10.3 15H7a4 4 0 0 0-4 4v2" }],
  ["path", { d: "M15 15.5V14a2 2 0 0 1 4 0v1.5" }],
  ["rect", { width: "8", height: "5", x: "13", y: "16", rx: ".899" }]
];

// node_modules/lucide/dist/esm/icons/user-minus.js
var UserMinus = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "9", cy: "7", r: "4" }],
  ["line", { x1: "22", x2: "16", y1: "11", y2: "11" }]
];

// node_modules/lucide/dist/esm/icons/user-pen.js
var UserPen = [
  ["path", { d: "M11.5 15H7a4 4 0 0 0-4 4v2" }],
  [
    "path",
    {
      d: "M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ],
  ["circle", { cx: "10", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/user-plus.js
var UserPlus = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "9", cy: "7", r: "4" }],
  ["line", { x1: "19", x2: "19", y1: "8", y2: "14" }],
  ["line", { x1: "22", x2: "16", y1: "11", y2: "11" }]
];

// node_modules/lucide/dist/esm/icons/user-round-check.js
var UserRoundCheck = [
  ["path", { d: "M2 21a8 8 0 0 1 13.292-6" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "m16 19 2 2 4-4" }]
];

// node_modules/lucide/dist/esm/icons/user-round-cog.js
var UserRoundCog = [
  ["path", { d: "m14.305 19.53.923-.382" }],
  ["path", { d: "m15.228 16.852-.923-.383" }],
  ["path", { d: "m16.852 15.228-.383-.923" }],
  ["path", { d: "m16.852 20.772-.383.924" }],
  ["path", { d: "m19.148 15.228.383-.923" }],
  ["path", { d: "m19.53 21.696-.382-.924" }],
  ["path", { d: "M2 21a8 8 0 0 1 10.434-7.62" }],
  ["path", { d: "m20.772 16.852.924-.383" }],
  ["path", { d: "m20.772 19.148.924.383" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/user-round-minus.js
var UserRoundMinus = [
  ["path", { d: "M2 21a8 8 0 0 1 13.292-6" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "M22 19h-6" }]
];

// node_modules/lucide/dist/esm/icons/user-round-pen.js
var UserRoundPen = [
  ["path", { d: "M2 21a8 8 0 0 1 10.821-7.487" }],
  [
    "path",
    {
      d: "M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ],
  ["circle", { cx: "10", cy: "8", r: "5" }]
];

// node_modules/lucide/dist/esm/icons/user-round-plus.js
var UserRoundPlus = [
  ["path", { d: "M2 21a8 8 0 0 1 13.292-6" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "M19 16v6" }],
  ["path", { d: "M22 19h-6" }]
];

// node_modules/lucide/dist/esm/icons/user-round-search.js
var UserRoundSearch = [
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "M2 21a8 8 0 0 1 10.434-7.62" }],
  ["circle", { cx: "18", cy: "18", r: "3" }],
  ["path", { d: "m22 22-1.9-1.9" }]
];

// node_modules/lucide/dist/esm/icons/user-round-x.js
var UserRoundX = [
  ["path", { d: "M2 21a8 8 0 0 1 11.873-7" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "m17 17 5 5" }],
  ["path", { d: "m22 17-5 5" }]
];

// node_modules/lucide/dist/esm/icons/user-round.js
var UserRound = [
  ["circle", { cx: "12", cy: "8", r: "5" }],
  ["path", { d: "M20 21a8 8 0 0 0-16 0" }]
];

// node_modules/lucide/dist/esm/icons/user-search.js
var UserSearch = [
  ["circle", { cx: "10", cy: "7", r: "4" }],
  ["path", { d: "M10.3 15H7a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "17", cy: "17", r: "3" }],
  ["path", { d: "m21 21-1.9-1.9" }]
];

// node_modules/lucide/dist/esm/icons/user-star.js
var UserStar = [
  [
    "path",
    {
      d: "M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"
    }
  ],
  ["path", { d: "M8 15H7a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "10", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/user-x.js
var UserX = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "9", cy: "7", r: "4" }],
  ["line", { x1: "17", x2: "22", y1: "8", y2: "13" }],
  ["line", { x1: "22", x2: "17", y1: "8", y2: "13" }]
];

// node_modules/lucide/dist/esm/icons/user.js
var User = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "12", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/users-round.js
var UsersRound = [
  ["path", { d: "M18 21a8 8 0 0 0-16 0" }],
  ["circle", { cx: "10", cy: "8", r: "5" }],
  ["path", { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" }]
];

// node_modules/lucide/dist/esm/icons/users.js
var Users = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
  ["circle", { cx: "9", cy: "7", r: "4" }]
];

// node_modules/lucide/dist/esm/icons/utensils-crossed.js
var UtensilsCrossed = [
  ["path", { d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" }],
  ["path", { d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" }],
  ["path", { d: "m2.1 21.8 6.4-6.3" }],
  ["path", { d: "m19 5-7 7" }]
];

// node_modules/lucide/dist/esm/icons/utensils.js
var Utensils = [
  ["path", { d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" }],
  ["path", { d: "M7 2v20" }],
  ["path", { d: "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" }]
];

// node_modules/lucide/dist/esm/icons/variable.js
var Variable = [
  ["path", { d: "M8 21s-4-3-4-9 4-9 4-9" }],
  ["path", { d: "M16 3s4 3 4 9-4 9-4 9" }],
  ["line", { x1: "15", x2: "9", y1: "9", y2: "15" }],
  ["line", { x1: "9", x2: "15", y1: "9", y2: "15" }]
];

// node_modules/lucide/dist/esm/icons/utility-pole.js
var UtilityPole = [
  ["path", { d: "M12 2v20" }],
  ["path", { d: "M2 5h20" }],
  ["path", { d: "M3 3v2" }],
  ["path", { d: "M7 3v2" }],
  ["path", { d: "M17 3v2" }],
  ["path", { d: "M21 3v2" }],
  ["path", { d: "m19 5-7 7-7-7" }]
];

// node_modules/lucide/dist/esm/icons/vault.js
var Vault = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor" }],
  ["path", { d: "m7.9 7.9 2.7 2.7" }],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor" }],
  ["path", { d: "m13.4 10.6 2.7-2.7" }],
  ["circle", { cx: "7.5", cy: "16.5", r: ".5", fill: "currentColor" }],
  ["path", { d: "m7.9 16.1 2.7-2.7" }],
  ["circle", { cx: "16.5", cy: "16.5", r: ".5", fill: "currentColor" }],
  ["path", { d: "m13.4 13.4 2.7 2.7" }],
  ["circle", { cx: "12", cy: "12", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/vector-square.js
var VectorSquare = [
  ["path", { d: "M19.5 7a24 24 0 0 1 0 10" }],
  ["path", { d: "M4.5 7a24 24 0 0 0 0 10" }],
  ["path", { d: "M7 19.5a24 24 0 0 0 10 0" }],
  ["path", { d: "M7 4.5a24 24 0 0 1 10 0" }],
  ["rect", { x: "17", y: "17", width: "5", height: "5", rx: "1" }],
  ["rect", { x: "17", y: "2", width: "5", height: "5", rx: "1" }],
  ["rect", { x: "2", y: "17", width: "5", height: "5", rx: "1" }],
  ["rect", { x: "2", y: "2", width: "5", height: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/vegan.js
var Vegan = [
  ["path", { d: "M16 8q6 0 6-6-6 0-6 6" }],
  ["path", { d: "M17.41 3.59a10 10 0 1 0 3 3" }],
  ["path", { d: "M2 2a26.6 26.6 0 0 1 10 20c.9-6.82 1.5-9.5 4-14" }]
];

// node_modules/lucide/dist/esm/icons/venetian-mask.js
var VenetianMask = [
  ["path", { d: "M18 11c-1.5 0-2.5.5-3 2" }],
  [
    "path",
    {
      d: "M4 6a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V8a2 2 0 0 0-2-2h-3a8 8 0 0 0-5 2 8 8 0 0 0-5-2z"
    }
  ],
  ["path", { d: "M6 11c1.5 0 2.5.5 3 2" }]
];

// node_modules/lucide/dist/esm/icons/venus-and-mars.js
var VenusAndMars = [
  ["path", { d: "M10 20h4" }],
  ["path", { d: "M12 16v6" }],
  ["path", { d: "M17 2h4v4" }],
  ["path", { d: "m21 2-5.46 5.46" }],
  ["circle", { cx: "12", cy: "11", r: "5" }]
];

// node_modules/lucide/dist/esm/icons/venus.js
var Venus = [
  ["path", { d: "M12 15v7" }],
  ["path", { d: "M9 19h6" }],
  ["circle", { cx: "12", cy: "9", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/vibrate-off.js
var VibrateOff = [
  ["path", { d: "m2 8 2 2-2 2 2 2-2 2" }],
  ["path", { d: "m22 8-2 2 2 2-2 2 2 2" }],
  ["path", { d: "M8 8v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2" }],
  ["path", { d: "M16 10.34V6c0-.55-.45-1-1-1h-4.34" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/vibrate.js
var Vibrate = [
  ["path", { d: "m2 8 2 2-2 2 2 2-2 2" }],
  ["path", { d: "m22 8-2 2 2 2-2 2 2 2" }],
  ["rect", { width: "8", height: "14", x: "8", y: "5", rx: "1" }]
];

// node_modules/lucide/dist/esm/icons/video-off.js
var VideoOff = [
  ["path", { d: "M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196" }],
  ["path", { d: "M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/video.js
var Video = [
  ["path", { d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" }],
  ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/videotape.js
var Videotape = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ["path", { d: "M2 8h20" }],
  ["circle", { cx: "8", cy: "14", r: "2" }],
  ["path", { d: "M8 12h8" }],
  ["circle", { cx: "16", cy: "14", r: "2" }]
];

// node_modules/lucide/dist/esm/icons/view.js
var View = [
  ["path", { d: "M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" }],
  ["path", { d: "M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" }],
  ["circle", { cx: "12", cy: "12", r: "1" }],
  [
    "path",
    {
      d: "M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/voicemail.js
var Voicemail = [
  ["circle", { cx: "6", cy: "12", r: "4" }],
  ["circle", { cx: "18", cy: "12", r: "4" }],
  ["line", { x1: "6", x2: "18", y1: "16", y2: "16" }]
];

// node_modules/lucide/dist/esm/icons/volleyball.js
var Volleyball = [
  ["path", { d: "M11.1 7.1a16.55 16.55 0 0 1 10.9 4" }],
  ["path", { d: "M12 12a12.6 12.6 0 0 1-8.7 5" }],
  ["path", { d: "M16.8 13.6a16.55 16.55 0 0 1-9 7.5" }],
  ["path", { d: "M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10" }],
  ["path", { d: "M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5" }],
  ["circle", { cx: "12", cy: "12", r: "10" }]
];

// node_modules/lucide/dist/esm/icons/volume-1.js
var Volume1 = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6" }]
];

// node_modules/lucide/dist/esm/icons/volume-2.js
var Volume2 = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728" }]
];

// node_modules/lucide/dist/esm/icons/volume-off.js
var VolumeOff = [
  ["path", { d: "M16 9a5 5 0 0 1 .95 2.293" }],
  ["path", { d: "M19.364 5.636a9 9 0 0 1 1.889 9.96" }],
  ["path", { d: "m2 2 20 20" }],
  [
    "path",
    {
      d: "m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"
    }
  ],
  ["path", { d: "M9.828 4.172A.686.686 0 0 1 11 4.657v.686" }]
];

// node_modules/lucide/dist/esm/icons/volume-x.js
var VolumeX = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
    }
  ],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15" }]
];

// node_modules/lucide/dist/esm/icons/volume.js
var Volume = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/vote.js
var Vote = [
  ["path", { d: "m9 12 2 2 4-4" }],
  ["path", { d: "M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" }],
  ["path", { d: "M22 19H2" }]
];

// node_modules/lucide/dist/esm/icons/wallet-cards.js
var WalletCards = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" }],
  [
    "path",
    { d: "M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" }
  ]
];

// node_modules/lucide/dist/esm/icons/wallet-minimal.js
var WalletMinimal = [
  ["path", { d: "M17 14h.01" }],
  ["path", { d: "M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14" }]
];

// node_modules/lucide/dist/esm/icons/wallet.js
var Wallet = [
  [
    "path",
    {
      d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
    }
  ],
  ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }]
];

// node_modules/lucide/dist/esm/icons/wand-sparkles.js
var WandSparkles = [
  [
    "path",
    {
      d: "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"
    }
  ],
  ["path", { d: "m14 7 3 3" }],
  ["path", { d: "M5 6v4" }],
  ["path", { d: "M19 14v4" }],
  ["path", { d: "M10 2v2" }],
  ["path", { d: "M7 8H3" }],
  ["path", { d: "M21 16h-4" }],
  ["path", { d: "M11 3H9" }]
];

// node_modules/lucide/dist/esm/icons/wallpaper.js
var Wallpaper = [
  ["path", { d: "M12 17v4" }],
  ["path", { d: "M8 21h8" }],
  ["path", { d: "m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15" }],
  ["circle", { cx: "8", cy: "9", r: "2" }],
  ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/wand.js
var Wand = [
  ["path", { d: "M15 4V2" }],
  ["path", { d: "M15 16v-2" }],
  ["path", { d: "M8 9h2" }],
  ["path", { d: "M20 9h2" }],
  ["path", { d: "M17.8 11.8 19 13" }],
  ["path", { d: "M15 9h.01" }],
  ["path", { d: "M17.8 6.2 19 5" }],
  ["path", { d: "m3 21 9-9" }],
  ["path", { d: "M12.2 6.2 11 5" }]
];

// node_modules/lucide/dist/esm/icons/warehouse.js
var Warehouse = [
  ["path", { d: "M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11" }],
  [
    "path",
    {
      d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z"
    }
  ],
  ["path", { d: "M6 13h12" }],
  ["path", { d: "M6 17h12" }]
];

// node_modules/lucide/dist/esm/icons/washing-machine.js
var WashingMachine = [
  ["path", { d: "M3 6h3" }],
  ["path", { d: "M17 6h.01" }],
  ["rect", { width: "18", height: "20", x: "3", y: "2", rx: "2" }],
  ["circle", { cx: "12", cy: "13", r: "5" }],
  ["path", { d: "M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5" }]
];

// node_modules/lucide/dist/esm/icons/watch.js
var Watch = [
  ["path", { d: "M12 10v2.2l1.6 1" }],
  ["path", { d: "m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05" }],
  ["path", { d: "m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05" }],
  ["circle", { cx: "12", cy: "12", r: "6" }]
];

// node_modules/lucide/dist/esm/icons/waves-ladder.js
var WavesLadder = [
  ["path", { d: "M19 5a2 2 0 0 0-2 2v11" }],
  [
    "path",
    {
      d: "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
    }
  ],
  ["path", { d: "M7 13h10" }],
  ["path", { d: "M7 9h10" }],
  ["path", { d: "M9 5a2 2 0 0 0-2 2v11" }]
];

// node_modules/lucide/dist/esm/icons/waypoints.js
var Waypoints = [
  ["circle", { cx: "12", cy: "4.5", r: "2.5" }],
  ["path", { d: "m10.2 6.3-3.9 3.9" }],
  ["circle", { cx: "4.5", cy: "12", r: "2.5" }],
  ["path", { d: "M7 12h10" }],
  ["circle", { cx: "19.5", cy: "12", r: "2.5" }],
  ["path", { d: "m13.8 17.7 3.9-3.9" }],
  ["circle", { cx: "12", cy: "19.5", r: "2.5" }]
];

// node_modules/lucide/dist/esm/icons/waves.js
var Waves = [
  [
    "path",
    { d: "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" }
  ],
  [
    "path",
    {
      d: "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
    }
  ],
  [
    "path",
    {
      d: "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/webcam.js
var Webcam = [
  ["circle", { cx: "12", cy: "10", r: "8" }],
  ["circle", { cx: "12", cy: "10", r: "3" }],
  ["path", { d: "M7 22h10" }],
  ["path", { d: "M12 22v-4" }]
];

// node_modules/lucide/dist/esm/icons/webhook-off.js
var WebhookOff = [
  ["path", { d: "M17 17h-5c-1.09-.02-1.94.92-2.5 1.9A3 3 0 1 1 2.57 15" }],
  ["path", { d: "M9 3.4a4 4 0 0 1 6.52.66" }],
  ["path", { d: "m6 17 3.1-5.8a2.5 2.5 0 0 0 .057-2.05" }],
  ["path", { d: "M20.3 20.3a4 4 0 0 1-2.3.7" }],
  ["path", { d: "M18.6 13a4 4 0 0 1 3.357 3.414" }],
  ["path", { d: "m12 6 .6 1" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/webhook.js
var Webhook = [
  ["path", { d: "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" }],
  ["path", { d: "m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" }],
  ["path", { d: "m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" }]
];

// node_modules/lucide/dist/esm/icons/weight.js
var Weight = [
  ["circle", { cx: "12", cy: "5", r: "3" }],
  [
    "path",
    {
      d: "M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/wheat-off.js
var WheatOff = [
  ["path", { d: "m2 22 10-10" }],
  ["path", { d: "m16 8-1.17 1.17" }],
  [
    "path",
    { d: "M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }
  ],
  ["path", { d: "m8 8-.53.53a3.5 3.5 0 0 0 0 4.94L9 15l1.53-1.53c.55-.55.88-1.25.98-1.97" }],
  ["path", { d: "M10.91 5.26c.15-.26.34-.51.56-.73L13 3l1.53 1.53a3.5 3.5 0 0 1 .28 4.62" }],
  ["path", { d: "M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" }],
  [
    "path",
    {
      d: "M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"
    }
  ],
  ["path", { d: "m16 16-.53.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.49 3.49 0 0 1 1.97-.98" }],
  ["path", { d: "M18.74 13.09c.26-.15.51-.34.73-.56L21 11l-1.53-1.53a3.5 3.5 0 0 0-4.62-.28" }],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/wheat.js
var Wheat = [
  ["path", { d: "M2 22 16 8" }],
  [
    "path",
    { d: "M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }
  ],
  [
    "path",
    { d: "M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }
  ],
  [
    "path",
    { d: "M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" }
  ],
  ["path", { d: "M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" }],
  [
    "path",
    {
      d: "M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"
    }
  ],
  [
    "path",
    {
      d: "M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"
    }
  ],
  [
    "path",
    {
      d: "M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/whole-word.js
var WholeWord = [
  ["circle", { cx: "7", cy: "12", r: "3" }],
  ["path", { d: "M10 9v6" }],
  ["circle", { cx: "17", cy: "12", r: "3" }],
  ["path", { d: "M14 7v8" }],
  ["path", { d: "M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" }]
];

// node_modules/lucide/dist/esm/icons/wifi-cog.js
var WifiCog = [
  ["path", { d: "m14.305 19.53.923-.382" }],
  ["path", { d: "m15.228 16.852-.923-.383" }],
  ["path", { d: "m16.852 15.228-.383-.923" }],
  ["path", { d: "m16.852 20.772-.383.924" }],
  ["path", { d: "m19.148 15.228.383-.923" }],
  ["path", { d: "m19.53 21.696-.382-.924" }],
  ["path", { d: "M2 7.82a15 15 0 0 1 20 0" }],
  ["path", { d: "m20.772 16.852.924-.383" }],
  ["path", { d: "m20.772 19.148.924.383" }],
  ["path", { d: "M5 11.858a10 10 0 0 1 11.5-1.785" }],
  ["path", { d: "M8.5 15.429a5 5 0 0 1 2.413-1.31" }],
  ["circle", { cx: "18", cy: "18", r: "3" }]
];

// node_modules/lucide/dist/esm/icons/wifi-high.js
var WifiHigh = [
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M5 12.859a10 10 0 0 1 14 0" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }]
];

// node_modules/lucide/dist/esm/icons/wifi-low.js
var WifiLow = [
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }]
];

// node_modules/lucide/dist/esm/icons/wifi-off.js
var WifiOff = [
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }],
  ["path", { d: "M5 12.859a10 10 0 0 1 5.17-2.69" }],
  ["path", { d: "M19 12.859a10 10 0 0 0-2.007-1.523" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 4.177-2.643" }],
  ["path", { d: "M22 8.82a15 15 0 0 0-11.288-3.764" }],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/wifi-pen.js
var WifiPen = [
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0" }],
  [
    "path",
    {
      d: "M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
    }
  ],
  ["path", { d: "M5 12.859a10 10 0 0 1 10.5-2.222" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 3-1.406" }]
];

// node_modules/lucide/dist/esm/icons/wifi-zero.js
var WifiZero = [["path", { d: "M12 20h.01" }]];

// node_modules/lucide/dist/esm/icons/wifi-sync.js
var WifiSync = [
  ["path", { d: "M11.965 10.105v4L13.5 12.5a5 5 0 0 1 8 1.5" }],
  ["path", { d: "M11.965 14.105h4" }],
  ["path", { d: "M17.965 18.105h4L20.43 19.71a5 5 0 0 1-8-1.5" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0" }],
  ["path", { d: "M21.965 22.105v-4" }],
  ["path", { d: "M5 12.86a10 10 0 0 1 3-2.032" }],
  ["path", { d: "M8.5 16.429h.01" }]
];

// node_modules/lucide/dist/esm/icons/wifi.js
var Wifi = [
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0" }],
  ["path", { d: "M5 12.859a10 10 0 0 1 14 0" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }]
];

// node_modules/lucide/dist/esm/icons/wind-arrow-down.js
var WindArrowDown = [
  ["path", { d: "M10 2v8" }],
  ["path", { d: "M12.8 21.6A2 2 0 1 0 14 18H2" }],
  ["path", { d: "M17.5 10a2.5 2.5 0 1 1 2 4H2" }],
  ["path", { d: "m6 6 4 4 4-4" }]
];

// node_modules/lucide/dist/esm/icons/wind.js
var Wind = [
  ["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2" }],
  ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2" }],
  ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2" }]
];

// node_modules/lucide/dist/esm/icons/wine-off.js
var WineOff = [
  ["path", { d: "M8 22h8" }],
  ["path", { d: "M7 10h3m7 0h-1.343" }],
  ["path", { d: "M12 15v7" }],
  [
    "path",
    {
      d: "M7.307 7.307A12.33 12.33 0 0 0 7 10a5 5 0 0 0 7.391 4.391M8.638 2.981C8.75 2.668 8.872 2.34 9 2h6c1.5 4 2 6 2 8 0 .407-.05.809-.145 1.198"
    }
  ],
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22" }]
];

// node_modules/lucide/dist/esm/icons/wine.js
var Wine = [
  ["path", { d: "M8 22h8" }],
  ["path", { d: "M7 10h10" }],
  ["path", { d: "M12 15v7" }],
  ["path", { d: "M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" }]
];

// node_modules/lucide/dist/esm/icons/workflow.js
var Workflow = [
  ["rect", { width: "8", height: "8", x: "3", y: "3", rx: "2" }],
  ["path", { d: "M7 11v4a2 2 0 0 0 2 2h4" }],
  ["rect", { width: "8", height: "8", x: "13", y: "13", rx: "2" }]
];

// node_modules/lucide/dist/esm/icons/wrench.js
var Wrench = [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/x.js
var X = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }]
];

// node_modules/lucide/dist/esm/icons/worm.js
var Worm = [
  ["path", { d: "m19 12-1.5 3" }],
  ["path", { d: "M19.63 18.81 22 20" }],
  [
    "path",
    {
      d: "M6.47 8.23a1.68 1.68 0 0 1 2.44 1.93l-.64 2.08a6.76 6.76 0 0 0 10.16 7.67l.42-.27a1 1 0 1 0-2.73-4.21l-.42.27a1.76 1.76 0 0 1-2.63-1.99l.64-2.08A6.66 6.66 0 0 0 3.94 3.9l-.7.4a1 1 0 1 0 2.55 4.34z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/youtube.js
var Youtube = [
  [
    "path",
    {
      d: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"
    }
  ],
  ["path", { d: "m10 15 5-3-5-3z" }]
];

// node_modules/lucide/dist/esm/icons/zap-off.js
var ZapOff = [
  ["path", { d: "M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317" }],
  ["path", { d: "M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773" }],
  [
    "path",
    {
      d: "M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643"
    }
  ],
  ["path", { d: "m2 2 20 20" }]
];

// node_modules/lucide/dist/esm/icons/zap.js
var Zap = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
    }
  ]
];

// node_modules/lucide/dist/esm/icons/zoom-in.js
var ZoomIn = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11" }]
];

// node_modules/lucide/dist/esm/icons/zoom-out.js
var ZoomOut = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11" }]
];

// node_modules/lucide/dist/esm/lucide.js
var createIcons = ({
  icons: icons2 = {},
  nameAttr = "data-lucide",
  attrs = {},
  root = document,
  inTemplates
} = {}) => {
  if (!Object.values(icons2).length) {
    throw new Error(
      "Please provide an icons object.\nIf you want to use all the icons you can import it like:\n `import { createIcons, icons } from 'lucide';\nlucide.createIcons({icons});`"
    );
  }
  if (typeof root === "undefined") {
    throw new Error("`createIcons()` only works in a browser environment.");
  }
  const elementsToReplace = Array.from(root.querySelectorAll(`[${nameAttr}]`));
  elementsToReplace.forEach((element) => replaceElement(element, { nameAttr, icons: icons2, attrs }));
  if (inTemplates) {
    const templates = Array.from(root.querySelectorAll("template"));
    templates.forEach(
      (template) => createIcons({
        icons: icons2,
        nameAttr,
        attrs,
        root: template.content,
        inTemplates
      })
    );
  }
  if (nameAttr === "data-lucide") {
    const deprecatedElements = root.querySelectorAll("[icon-name]");
    if (deprecatedElements.length > 0) {
      console.warn(
        "[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"
      );
      Array.from(deprecatedElements).forEach(
        (element) => replaceElement(element, { nameAttr: "icon-name", icons: icons2, attrs })
      );
    }
  }
};

// resources/js/lucide.ts
createIcons({ icons: iconsAndAliases_exports });

// resources/js/app.ts
window.__DEV__ = false;
window.baseUrl = baseUrl;
window.importVersioned = importVersioned;
window.$http = new HttpManager();
window.$events = new EventManager();
window.$trans = new Translator();
window.$components = new ComponentStore();
window.$components.register(components_exports);
window.$components.init();
/*! Bundled license information:

sortablejs/modular/sortable.esm.js:
  (**!
   * Sortable 1.15.6
   * @author	RubaXa   <trash@rubaxa.org>
   * @author	owenm    <owen23355@gmail.com>
   * @license MIT
   *)

lucide/dist/esm/defaultAttributes.js:
lucide/dist/esm/createElement.js:
lucide/dist/esm/replaceElement.js:
lucide/dist/esm/icons/a-arrow-down.js:
lucide/dist/esm/icons/a-arrow-up.js:
lucide/dist/esm/icons/a-large-small.js:
lucide/dist/esm/icons/accessibility.js:
lucide/dist/esm/icons/activity.js:
lucide/dist/esm/icons/air-vent.js:
lucide/dist/esm/icons/airplay.js:
lucide/dist/esm/icons/alarm-clock-check.js:
lucide/dist/esm/icons/alarm-clock-minus.js:
lucide/dist/esm/icons/alarm-clock-off.js:
lucide/dist/esm/icons/alarm-clock-plus.js:
lucide/dist/esm/icons/alarm-clock.js:
lucide/dist/esm/icons/alarm-smoke.js:
lucide/dist/esm/icons/album.js:
lucide/dist/esm/icons/align-center-horizontal.js:
lucide/dist/esm/icons/align-center-vertical.js:
lucide/dist/esm/icons/align-end-horizontal.js:
lucide/dist/esm/icons/align-end-vertical.js:
lucide/dist/esm/icons/align-horizontal-distribute-center.js:
lucide/dist/esm/icons/align-horizontal-distribute-end.js:
lucide/dist/esm/icons/align-horizontal-distribute-start.js:
lucide/dist/esm/icons/align-horizontal-justify-center.js:
lucide/dist/esm/icons/align-horizontal-justify-end.js:
lucide/dist/esm/icons/align-horizontal-justify-start.js:
lucide/dist/esm/icons/align-horizontal-space-around.js:
lucide/dist/esm/icons/align-horizontal-space-between.js:
lucide/dist/esm/icons/align-start-horizontal.js:
lucide/dist/esm/icons/align-start-vertical.js:
lucide/dist/esm/icons/align-vertical-distribute-center.js:
lucide/dist/esm/icons/align-vertical-distribute-end.js:
lucide/dist/esm/icons/align-vertical-distribute-start.js:
lucide/dist/esm/icons/align-vertical-justify-center.js:
lucide/dist/esm/icons/align-vertical-justify-end.js:
lucide/dist/esm/icons/align-vertical-justify-start.js:
lucide/dist/esm/icons/align-vertical-space-around.js:
lucide/dist/esm/icons/align-vertical-space-between.js:
lucide/dist/esm/icons/ambulance.js:
lucide/dist/esm/icons/ampersand.js:
lucide/dist/esm/icons/ampersands.js:
lucide/dist/esm/icons/amphora.js:
lucide/dist/esm/icons/anchor.js:
lucide/dist/esm/icons/angry.js:
lucide/dist/esm/icons/annoyed.js:
lucide/dist/esm/icons/antenna.js:
lucide/dist/esm/icons/anvil.js:
lucide/dist/esm/icons/aperture.js:
lucide/dist/esm/icons/app-window-mac.js:
lucide/dist/esm/icons/app-window.js:
lucide/dist/esm/icons/apple.js:
lucide/dist/esm/icons/archive-restore.js:
lucide/dist/esm/icons/archive-x.js:
lucide/dist/esm/icons/archive.js:
lucide/dist/esm/icons/armchair.js:
lucide/dist/esm/icons/arrow-big-down-dash.js:
lucide/dist/esm/icons/arrow-big-down.js:
lucide/dist/esm/icons/arrow-big-left-dash.js:
lucide/dist/esm/icons/arrow-big-left.js:
lucide/dist/esm/icons/arrow-big-right-dash.js:
lucide/dist/esm/icons/arrow-big-right.js:
lucide/dist/esm/icons/arrow-big-up-dash.js:
lucide/dist/esm/icons/arrow-big-up.js:
lucide/dist/esm/icons/arrow-down-0-1.js:
lucide/dist/esm/icons/arrow-down-1-0.js:
lucide/dist/esm/icons/arrow-down-a-z.js:
lucide/dist/esm/icons/arrow-down-from-line.js:
lucide/dist/esm/icons/arrow-down-left.js:
lucide/dist/esm/icons/arrow-down-narrow-wide.js:
lucide/dist/esm/icons/arrow-down-right.js:
lucide/dist/esm/icons/arrow-down-to-dot.js:
lucide/dist/esm/icons/arrow-down-to-line.js:
lucide/dist/esm/icons/arrow-down-up.js:
lucide/dist/esm/icons/arrow-down-wide-narrow.js:
lucide/dist/esm/icons/arrow-down-z-a.js:
lucide/dist/esm/icons/arrow-down.js:
lucide/dist/esm/icons/arrow-left-right.js:
lucide/dist/esm/icons/arrow-left-from-line.js:
lucide/dist/esm/icons/arrow-left-to-line.js:
lucide/dist/esm/icons/arrow-left.js:
lucide/dist/esm/icons/arrow-right-from-line.js:
lucide/dist/esm/icons/arrow-right-left.js:
lucide/dist/esm/icons/arrow-right-to-line.js:
lucide/dist/esm/icons/arrow-right.js:
lucide/dist/esm/icons/arrow-up-0-1.js:
lucide/dist/esm/icons/arrow-up-1-0.js:
lucide/dist/esm/icons/arrow-up-a-z.js:
lucide/dist/esm/icons/arrow-up-down.js:
lucide/dist/esm/icons/arrow-up-from-dot.js:
lucide/dist/esm/icons/arrow-up-from-line.js:
lucide/dist/esm/icons/arrow-up-left.js:
lucide/dist/esm/icons/arrow-up-narrow-wide.js:
lucide/dist/esm/icons/arrow-up-right.js:
lucide/dist/esm/icons/arrow-up-to-line.js:
lucide/dist/esm/icons/arrow-up-wide-narrow.js:
lucide/dist/esm/icons/arrow-up-z-a.js:
lucide/dist/esm/icons/arrow-up.js:
lucide/dist/esm/icons/arrows-up-from-line.js:
lucide/dist/esm/icons/asterisk.js:
lucide/dist/esm/icons/at-sign.js:
lucide/dist/esm/icons/atom.js:
lucide/dist/esm/icons/audio-lines.js:
lucide/dist/esm/icons/audio-waveform.js:
lucide/dist/esm/icons/award.js:
lucide/dist/esm/icons/axe.js:
lucide/dist/esm/icons/axis-3d.js:
lucide/dist/esm/icons/baby.js:
lucide/dist/esm/icons/backpack.js:
lucide/dist/esm/icons/badge-alert.js:
lucide/dist/esm/icons/badge-cent.js:
lucide/dist/esm/icons/badge-check.js:
lucide/dist/esm/icons/badge-dollar-sign.js:
lucide/dist/esm/icons/badge-euro.js:
lucide/dist/esm/icons/badge-indian-rupee.js:
lucide/dist/esm/icons/badge-info.js:
lucide/dist/esm/icons/badge-japanese-yen.js:
lucide/dist/esm/icons/badge-minus.js:
lucide/dist/esm/icons/badge-percent.js:
lucide/dist/esm/icons/badge-plus.js:
lucide/dist/esm/icons/badge-pound-sterling.js:
lucide/dist/esm/icons/badge-question-mark.js:
lucide/dist/esm/icons/badge-russian-ruble.js:
lucide/dist/esm/icons/badge-swiss-franc.js:
lucide/dist/esm/icons/badge-turkish-lira.js:
lucide/dist/esm/icons/badge-x.js:
lucide/dist/esm/icons/badge.js:
lucide/dist/esm/icons/baggage-claim.js:
lucide/dist/esm/icons/ban.js:
lucide/dist/esm/icons/banana.js:
lucide/dist/esm/icons/bandage.js:
lucide/dist/esm/icons/banknote-arrow-down.js:
lucide/dist/esm/icons/banknote-x.js:
lucide/dist/esm/icons/banknote-arrow-up.js:
lucide/dist/esm/icons/banknote.js:
lucide/dist/esm/icons/barcode.js:
lucide/dist/esm/icons/barrel.js:
lucide/dist/esm/icons/baseline.js:
lucide/dist/esm/icons/bath.js:
lucide/dist/esm/icons/battery-charging.js:
lucide/dist/esm/icons/battery-full.js:
lucide/dist/esm/icons/battery-low.js:
lucide/dist/esm/icons/battery-plus.js:
lucide/dist/esm/icons/battery-medium.js:
lucide/dist/esm/icons/battery-warning.js:
lucide/dist/esm/icons/battery.js:
lucide/dist/esm/icons/beaker.js:
lucide/dist/esm/icons/bean-off.js:
lucide/dist/esm/icons/bed-double.js:
lucide/dist/esm/icons/bean.js:
lucide/dist/esm/icons/bed-single.js:
lucide/dist/esm/icons/beef.js:
lucide/dist/esm/icons/bed.js:
lucide/dist/esm/icons/beer-off.js:
lucide/dist/esm/icons/beer.js:
lucide/dist/esm/icons/bell-electric.js:
lucide/dist/esm/icons/bell-dot.js:
lucide/dist/esm/icons/bell-minus.js:
lucide/dist/esm/icons/bell-off.js:
lucide/dist/esm/icons/bell-plus.js:
lucide/dist/esm/icons/bell-ring.js:
lucide/dist/esm/icons/bell.js:
lucide/dist/esm/icons/between-horizontal-end.js:
lucide/dist/esm/icons/between-horizontal-start.js:
lucide/dist/esm/icons/between-vertical-end.js:
lucide/dist/esm/icons/between-vertical-start.js:
lucide/dist/esm/icons/biceps-flexed.js:
lucide/dist/esm/icons/bike.js:
lucide/dist/esm/icons/binary.js:
lucide/dist/esm/icons/binoculars.js:
lucide/dist/esm/icons/biohazard.js:
lucide/dist/esm/icons/bird.js:
lucide/dist/esm/icons/birdhouse.js:
lucide/dist/esm/icons/blend.js:
lucide/dist/esm/icons/blinds.js:
lucide/dist/esm/icons/bitcoin.js:
lucide/dist/esm/icons/blocks.js:
lucide/dist/esm/icons/bluetooth-connected.js:
lucide/dist/esm/icons/bluetooth-off.js:
lucide/dist/esm/icons/bluetooth.js:
lucide/dist/esm/icons/bold.js:
lucide/dist/esm/icons/bluetooth-searching.js:
lucide/dist/esm/icons/bolt.js:
lucide/dist/esm/icons/bomb.js:
lucide/dist/esm/icons/bone.js:
lucide/dist/esm/icons/book-a.js:
lucide/dist/esm/icons/book-alert.js:
lucide/dist/esm/icons/book-audio.js:
lucide/dist/esm/icons/book-check.js:
lucide/dist/esm/icons/book-copy.js:
lucide/dist/esm/icons/book-dashed.js:
lucide/dist/esm/icons/book-headphones.js:
lucide/dist/esm/icons/book-down.js:
lucide/dist/esm/icons/book-heart.js:
lucide/dist/esm/icons/book-image.js:
lucide/dist/esm/icons/book-key.js:
lucide/dist/esm/icons/book-lock.js:
lucide/dist/esm/icons/book-marked.js:
lucide/dist/esm/icons/book-minus.js:
lucide/dist/esm/icons/book-open-check.js:
lucide/dist/esm/icons/book-open-text.js:
lucide/dist/esm/icons/book-open.js:
lucide/dist/esm/icons/book-plus.js:
lucide/dist/esm/icons/book-text.js:
lucide/dist/esm/icons/book-type.js:
lucide/dist/esm/icons/book-up-2.js:
lucide/dist/esm/icons/book-up.js:
lucide/dist/esm/icons/book-user.js:
lucide/dist/esm/icons/book-x.js:
lucide/dist/esm/icons/book.js:
lucide/dist/esm/icons/bookmark-check.js:
lucide/dist/esm/icons/bookmark-minus.js:
lucide/dist/esm/icons/bookmark-plus.js:
lucide/dist/esm/icons/bookmark-x.js:
lucide/dist/esm/icons/bookmark.js:
lucide/dist/esm/icons/bot-message-square.js:
lucide/dist/esm/icons/boom-box.js:
lucide/dist/esm/icons/bot-off.js:
lucide/dist/esm/icons/bot.js:
lucide/dist/esm/icons/bottle-wine.js:
lucide/dist/esm/icons/bow-arrow.js:
lucide/dist/esm/icons/box.js:
lucide/dist/esm/icons/boxes.js:
lucide/dist/esm/icons/braces.js:
lucide/dist/esm/icons/brackets.js:
lucide/dist/esm/icons/brain-circuit.js:
lucide/dist/esm/icons/brain-cog.js:
lucide/dist/esm/icons/brain.js:
lucide/dist/esm/icons/brick-wall-fire.js:
lucide/dist/esm/icons/brick-wall-shield.js:
lucide/dist/esm/icons/brick-wall.js:
lucide/dist/esm/icons/briefcase-business.js:
lucide/dist/esm/icons/briefcase-conveyor-belt.js:
lucide/dist/esm/icons/briefcase-medical.js:
lucide/dist/esm/icons/briefcase.js:
lucide/dist/esm/icons/bring-to-front.js:
lucide/dist/esm/icons/brush-cleaning.js:
lucide/dist/esm/icons/brush.js:
lucide/dist/esm/icons/bubbles.js:
lucide/dist/esm/icons/bug-off.js:
lucide/dist/esm/icons/bug-play.js:
lucide/dist/esm/icons/bug.js:
lucide/dist/esm/icons/building-2.js:
lucide/dist/esm/icons/building.js:
lucide/dist/esm/icons/bus-front.js:
lucide/dist/esm/icons/bus.js:
lucide/dist/esm/icons/cable-car.js:
lucide/dist/esm/icons/cable.js:
lucide/dist/esm/icons/cake-slice.js:
lucide/dist/esm/icons/cake.js:
lucide/dist/esm/icons/calculator.js:
lucide/dist/esm/icons/calendar-1.js:
lucide/dist/esm/icons/calendar-arrow-down.js:
lucide/dist/esm/icons/calendar-arrow-up.js:
lucide/dist/esm/icons/calendar-check-2.js:
lucide/dist/esm/icons/calendar-check.js:
lucide/dist/esm/icons/calendar-clock.js:
lucide/dist/esm/icons/calendar-cog.js:
lucide/dist/esm/icons/calendar-days.js:
lucide/dist/esm/icons/calendar-fold.js:
lucide/dist/esm/icons/calendar-heart.js:
lucide/dist/esm/icons/calendar-minus-2.js:
lucide/dist/esm/icons/calendar-minus.js:
lucide/dist/esm/icons/calendar-off.js:
lucide/dist/esm/icons/calendar-plus-2.js:
lucide/dist/esm/icons/calendar-plus.js:
lucide/dist/esm/icons/calendar-range.js:
lucide/dist/esm/icons/calendar-search.js:
lucide/dist/esm/icons/calendar-sync.js:
lucide/dist/esm/icons/calendar-x-2.js:
lucide/dist/esm/icons/calendar-x.js:
lucide/dist/esm/icons/calendar.js:
lucide/dist/esm/icons/camera.js:
lucide/dist/esm/icons/camera-off.js:
lucide/dist/esm/icons/candy-cane.js:
lucide/dist/esm/icons/candy-off.js:
lucide/dist/esm/icons/candy.js:
lucide/dist/esm/icons/cannabis.js:
lucide/dist/esm/icons/captions-off.js:
lucide/dist/esm/icons/captions.js:
lucide/dist/esm/icons/car-front.js:
lucide/dist/esm/icons/car-taxi-front.js:
lucide/dist/esm/icons/car.js:
lucide/dist/esm/icons/caravan.js:
lucide/dist/esm/icons/carrot.js:
lucide/dist/esm/icons/card-sim.js:
lucide/dist/esm/icons/case-lower.js:
lucide/dist/esm/icons/case-sensitive.js:
lucide/dist/esm/icons/case-upper.js:
lucide/dist/esm/icons/cast.js:
lucide/dist/esm/icons/cassette-tape.js:
lucide/dist/esm/icons/castle.js:
lucide/dist/esm/icons/cat.js:
lucide/dist/esm/icons/cctv.js:
lucide/dist/esm/icons/chart-area.js:
lucide/dist/esm/icons/chart-bar-big.js:
lucide/dist/esm/icons/chart-bar-decreasing.js:
lucide/dist/esm/icons/chart-bar-increasing.js:
lucide/dist/esm/icons/chart-bar-stacked.js:
lucide/dist/esm/icons/chart-bar.js:
lucide/dist/esm/icons/chart-candlestick.js:
lucide/dist/esm/icons/chart-column-big.js:
lucide/dist/esm/icons/chart-column-decreasing.js:
lucide/dist/esm/icons/chart-column-increasing.js:
lucide/dist/esm/icons/chart-column-stacked.js:
lucide/dist/esm/icons/chart-column.js:
lucide/dist/esm/icons/chart-gantt.js:
lucide/dist/esm/icons/chart-line.js:
lucide/dist/esm/icons/chart-network.js:
lucide/dist/esm/icons/chart-no-axes-column-decreasing.js:
lucide/dist/esm/icons/chart-no-axes-column-increasing.js:
lucide/dist/esm/icons/chart-no-axes-column.js:
lucide/dist/esm/icons/chart-no-axes-gantt.js:
lucide/dist/esm/icons/chart-no-axes-combined.js:
lucide/dist/esm/icons/chart-pie.js:
lucide/dist/esm/icons/chart-scatter.js:
lucide/dist/esm/icons/chart-spline.js:
lucide/dist/esm/icons/check-check.js:
lucide/dist/esm/icons/check.js:
lucide/dist/esm/icons/check-line.js:
lucide/dist/esm/icons/chef-hat.js:
lucide/dist/esm/icons/cherry.js:
lucide/dist/esm/icons/chevron-down.js:
lucide/dist/esm/icons/chevron-first.js:
lucide/dist/esm/icons/chevron-last.js:
lucide/dist/esm/icons/chevron-right.js:
lucide/dist/esm/icons/chevron-up.js:
lucide/dist/esm/icons/chevron-left.js:
lucide/dist/esm/icons/chevrons-down-up.js:
lucide/dist/esm/icons/chevrons-down.js:
lucide/dist/esm/icons/chevrons-left-right-ellipsis.js:
lucide/dist/esm/icons/chevrons-left-right.js:
lucide/dist/esm/icons/chevrons-left.js:
lucide/dist/esm/icons/chevrons-right-left.js:
lucide/dist/esm/icons/chevrons-right.js:
lucide/dist/esm/icons/chevrons-up.js:
lucide/dist/esm/icons/chevrons-up-down.js:
lucide/dist/esm/icons/church.js:
lucide/dist/esm/icons/chromium.js:
lucide/dist/esm/icons/cigarette-off.js:
lucide/dist/esm/icons/cigarette.js:
lucide/dist/esm/icons/circle-alert.js:
lucide/dist/esm/icons/circle-arrow-down.js:
lucide/dist/esm/icons/circle-arrow-left.js:
lucide/dist/esm/icons/circle-arrow-out-down-left.js:
lucide/dist/esm/icons/circle-arrow-out-down-right.js:
lucide/dist/esm/icons/circle-arrow-out-up-left.js:
lucide/dist/esm/icons/circle-arrow-out-up-right.js:
lucide/dist/esm/icons/circle-arrow-right.js:
lucide/dist/esm/icons/circle-arrow-up.js:
lucide/dist/esm/icons/circle-check-big.js:
lucide/dist/esm/icons/circle-chevron-down.js:
lucide/dist/esm/icons/circle-check.js:
lucide/dist/esm/icons/circle-chevron-left.js:
lucide/dist/esm/icons/circle-chevron-right.js:
lucide/dist/esm/icons/circle-chevron-up.js:
lucide/dist/esm/icons/circle-dashed.js:
lucide/dist/esm/icons/circle-divide.js:
lucide/dist/esm/icons/circle-dollar-sign.js:
lucide/dist/esm/icons/circle-dot-dashed.js:
lucide/dist/esm/icons/circle-dot.js:
lucide/dist/esm/icons/circle-ellipsis.js:
lucide/dist/esm/icons/circle-equal.js:
lucide/dist/esm/icons/circle-fading-arrow-up.js:
lucide/dist/esm/icons/circle-fading-plus.js:
lucide/dist/esm/icons/circle-gauge.js:
lucide/dist/esm/icons/circle-minus.js:
lucide/dist/esm/icons/circle-off.js:
lucide/dist/esm/icons/circle-parking-off.js:
lucide/dist/esm/icons/circle-parking.js:
lucide/dist/esm/icons/circle-pause.js:
lucide/dist/esm/icons/circle-percent.js:
lucide/dist/esm/icons/circle-play.js:
lucide/dist/esm/icons/circle-plus.js:
lucide/dist/esm/icons/circle-pound-sterling.js:
lucide/dist/esm/icons/circle-power.js:
lucide/dist/esm/icons/circle-question-mark.js:
lucide/dist/esm/icons/circle-slash-2.js:
lucide/dist/esm/icons/circle-slash.js:
lucide/dist/esm/icons/circle-small.js:
lucide/dist/esm/icons/circle-star.js:
lucide/dist/esm/icons/circle-stop.js:
lucide/dist/esm/icons/circle-user-round.js:
lucide/dist/esm/icons/circle-user.js:
lucide/dist/esm/icons/circle-x.js:
lucide/dist/esm/icons/circle.js:
lucide/dist/esm/icons/circuit-board.js:
lucide/dist/esm/icons/citrus.js:
lucide/dist/esm/icons/clapperboard.js:
lucide/dist/esm/icons/clipboard-check.js:
lucide/dist/esm/icons/clipboard-clock.js:
lucide/dist/esm/icons/clipboard-copy.js:
lucide/dist/esm/icons/clipboard-list.js:
lucide/dist/esm/icons/clipboard-minus.js:
lucide/dist/esm/icons/clipboard-paste.js:
lucide/dist/esm/icons/clipboard-pen-line.js:
lucide/dist/esm/icons/clipboard-pen.js:
lucide/dist/esm/icons/clipboard-type.js:
lucide/dist/esm/icons/clipboard-x.js:
lucide/dist/esm/icons/clipboard-plus.js:
lucide/dist/esm/icons/clipboard.js:
lucide/dist/esm/icons/clock-1.js:
lucide/dist/esm/icons/clock-10.js:
lucide/dist/esm/icons/clock-11.js:
lucide/dist/esm/icons/clock-12.js:
lucide/dist/esm/icons/clock-2.js:
lucide/dist/esm/icons/clock-3.js:
lucide/dist/esm/icons/clock-4.js:
lucide/dist/esm/icons/clock-5.js:
lucide/dist/esm/icons/clock-6.js:
lucide/dist/esm/icons/clock-7.js:
lucide/dist/esm/icons/clock-8.js:
lucide/dist/esm/icons/clock-9.js:
lucide/dist/esm/icons/clock-alert.js:
lucide/dist/esm/icons/clock-arrow-down.js:
lucide/dist/esm/icons/clock-arrow-up.js:
lucide/dist/esm/icons/clock-fading.js:
lucide/dist/esm/icons/clock-plus.js:
lucide/dist/esm/icons/clock.js:
lucide/dist/esm/icons/closed-caption.js:
lucide/dist/esm/icons/cloud-alert.js:
lucide/dist/esm/icons/cloud-check.js:
lucide/dist/esm/icons/cloud-cog.js:
lucide/dist/esm/icons/cloud-download.js:
lucide/dist/esm/icons/cloud-drizzle.js:
lucide/dist/esm/icons/cloud-fog.js:
lucide/dist/esm/icons/cloud-hail.js:
lucide/dist/esm/icons/cloud-lightning.js:
lucide/dist/esm/icons/cloud-moon-rain.js:
lucide/dist/esm/icons/cloud-off.js:
lucide/dist/esm/icons/cloud-moon.js:
lucide/dist/esm/icons/cloud-rain-wind.js:
lucide/dist/esm/icons/cloud-rain.js:
lucide/dist/esm/icons/cloud-snow.js:
lucide/dist/esm/icons/cloud-sun-rain.js:
lucide/dist/esm/icons/cloud-sun.js:
lucide/dist/esm/icons/cloud-upload.js:
lucide/dist/esm/icons/cloud.js:
lucide/dist/esm/icons/cloudy.js:
lucide/dist/esm/icons/clover.js:
lucide/dist/esm/icons/club.js:
lucide/dist/esm/icons/code-xml.js:
lucide/dist/esm/icons/code.js:
lucide/dist/esm/icons/codepen.js:
lucide/dist/esm/icons/codesandbox.js:
lucide/dist/esm/icons/coffee.js:
lucide/dist/esm/icons/cog.js:
lucide/dist/esm/icons/coins.js:
lucide/dist/esm/icons/columns-2.js:
lucide/dist/esm/icons/columns-3-cog.js:
lucide/dist/esm/icons/columns-3.js:
lucide/dist/esm/icons/columns-4.js:
lucide/dist/esm/icons/combine.js:
lucide/dist/esm/icons/compass.js:
lucide/dist/esm/icons/command.js:
lucide/dist/esm/icons/component.js:
lucide/dist/esm/icons/computer.js:
lucide/dist/esm/icons/concierge-bell.js:
lucide/dist/esm/icons/cone.js:
lucide/dist/esm/icons/construction.js:
lucide/dist/esm/icons/contact-round.js:
lucide/dist/esm/icons/container.js:
lucide/dist/esm/icons/contact.js:
lucide/dist/esm/icons/contrast.js:
lucide/dist/esm/icons/cookie.js:
lucide/dist/esm/icons/cooking-pot.js:
lucide/dist/esm/icons/copy-check.js:
lucide/dist/esm/icons/copy-minus.js:
lucide/dist/esm/icons/copy-plus.js:
lucide/dist/esm/icons/copy-slash.js:
lucide/dist/esm/icons/copy-x.js:
lucide/dist/esm/icons/copy.js:
lucide/dist/esm/icons/copyleft.js:
lucide/dist/esm/icons/copyright.js:
lucide/dist/esm/icons/corner-down-right.js:
lucide/dist/esm/icons/corner-down-left.js:
lucide/dist/esm/icons/corner-left-down.js:
lucide/dist/esm/icons/corner-left-up.js:
lucide/dist/esm/icons/corner-right-down.js:
lucide/dist/esm/icons/corner-right-up.js:
lucide/dist/esm/icons/corner-up-left.js:
lucide/dist/esm/icons/corner-up-right.js:
lucide/dist/esm/icons/cpu.js:
lucide/dist/esm/icons/creative-commons.js:
lucide/dist/esm/icons/credit-card.js:
lucide/dist/esm/icons/croissant.js:
lucide/dist/esm/icons/crop.js:
lucide/dist/esm/icons/cross.js:
lucide/dist/esm/icons/crosshair.js:
lucide/dist/esm/icons/crown.js:
lucide/dist/esm/icons/cuboid.js:
lucide/dist/esm/icons/cup-soda.js:
lucide/dist/esm/icons/currency.js:
lucide/dist/esm/icons/cylinder.js:
lucide/dist/esm/icons/dam.js:
lucide/dist/esm/icons/database-zap.js:
lucide/dist/esm/icons/database-backup.js:
lucide/dist/esm/icons/decimals-arrow-left.js:
lucide/dist/esm/icons/database.js:
lucide/dist/esm/icons/decimals-arrow-right.js:
lucide/dist/esm/icons/dessert.js:
lucide/dist/esm/icons/delete.js:
lucide/dist/esm/icons/diameter.js:
lucide/dist/esm/icons/diamond-minus.js:
lucide/dist/esm/icons/diamond-percent.js:
lucide/dist/esm/icons/diamond-plus.js:
lucide/dist/esm/icons/diamond.js:
lucide/dist/esm/icons/dice-1.js:
lucide/dist/esm/icons/dice-2.js:
lucide/dist/esm/icons/dice-3.js:
lucide/dist/esm/icons/dice-4.js:
lucide/dist/esm/icons/dice-5.js:
lucide/dist/esm/icons/dices.js:
lucide/dist/esm/icons/dice-6.js:
lucide/dist/esm/icons/diff.js:
lucide/dist/esm/icons/disc-2.js:
lucide/dist/esm/icons/disc-3.js:
lucide/dist/esm/icons/disc-album.js:
lucide/dist/esm/icons/disc.js:
lucide/dist/esm/icons/divide.js:
lucide/dist/esm/icons/dna-off.js:
lucide/dist/esm/icons/dna.js:
lucide/dist/esm/icons/dock.js:
lucide/dist/esm/icons/dog.js:
lucide/dist/esm/icons/dollar-sign.js:
lucide/dist/esm/icons/donut.js:
lucide/dist/esm/icons/door-closed-locked.js:
lucide/dist/esm/icons/door-closed.js:
lucide/dist/esm/icons/door-open.js:
lucide/dist/esm/icons/dot.js:
lucide/dist/esm/icons/download.js:
lucide/dist/esm/icons/drafting-compass.js:
lucide/dist/esm/icons/drama.js:
lucide/dist/esm/icons/dribbble.js:
lucide/dist/esm/icons/drill.js:
lucide/dist/esm/icons/drone.js:
lucide/dist/esm/icons/droplet-off.js:
lucide/dist/esm/icons/droplet.js:
lucide/dist/esm/icons/drum.js:
lucide/dist/esm/icons/droplets.js:
lucide/dist/esm/icons/drumstick.js:
lucide/dist/esm/icons/dumbbell.js:
lucide/dist/esm/icons/ear-off.js:
lucide/dist/esm/icons/earth-lock.js:
lucide/dist/esm/icons/ear.js:
lucide/dist/esm/icons/earth.js:
lucide/dist/esm/icons/eclipse.js:
lucide/dist/esm/icons/egg-fried.js:
lucide/dist/esm/icons/egg-off.js:
lucide/dist/esm/icons/egg.js:
lucide/dist/esm/icons/ellipsis-vertical.js:
lucide/dist/esm/icons/ellipsis.js:
lucide/dist/esm/icons/equal-approximately.js:
lucide/dist/esm/icons/equal-not.js:
lucide/dist/esm/icons/equal.js:
lucide/dist/esm/icons/eraser.js:
lucide/dist/esm/icons/ethernet-port.js:
lucide/dist/esm/icons/euro.js:
lucide/dist/esm/icons/ev-charger.js:
lucide/dist/esm/icons/expand.js:
lucide/dist/esm/icons/eye-closed.js:
lucide/dist/esm/icons/eye-off.js:
lucide/dist/esm/icons/external-link.js:
lucide/dist/esm/icons/eye.js:
lucide/dist/esm/icons/facebook.js:
lucide/dist/esm/icons/factory.js:
lucide/dist/esm/icons/fan.js:
lucide/dist/esm/icons/fast-forward.js:
lucide/dist/esm/icons/feather.js:
lucide/dist/esm/icons/fence.js:
lucide/dist/esm/icons/ferris-wheel.js:
lucide/dist/esm/icons/figma.js:
lucide/dist/esm/icons/file-archive.js:
lucide/dist/esm/icons/file-audio-2.js:
lucide/dist/esm/icons/file-audio.js:
lucide/dist/esm/icons/file-badge-2.js:
lucide/dist/esm/icons/file-axis-3d.js:
lucide/dist/esm/icons/file-box.js:
lucide/dist/esm/icons/file-badge.js:
lucide/dist/esm/icons/file-chart-column-increasing.js:
lucide/dist/esm/icons/file-chart-column.js:
lucide/dist/esm/icons/file-chart-pie.js:
lucide/dist/esm/icons/file-chart-line.js:
lucide/dist/esm/icons/file-check-2.js:
lucide/dist/esm/icons/file-check.js:
lucide/dist/esm/icons/file-clock.js:
lucide/dist/esm/icons/file-code-2.js:
lucide/dist/esm/icons/file-code.js:
lucide/dist/esm/icons/file-cog.js:
lucide/dist/esm/icons/file-diff.js:
lucide/dist/esm/icons/file-digit.js:
lucide/dist/esm/icons/file-down.js:
lucide/dist/esm/icons/file-heart.js:
lucide/dist/esm/icons/file-image.js:
lucide/dist/esm/icons/file-input.js:
lucide/dist/esm/icons/file-json-2.js:
lucide/dist/esm/icons/file-json.js:
lucide/dist/esm/icons/file-key-2.js:
lucide/dist/esm/icons/file-key.js:
lucide/dist/esm/icons/file-lock-2.js:
lucide/dist/esm/icons/file-lock.js:
lucide/dist/esm/icons/file-minus.js:
lucide/dist/esm/icons/file-minus-2.js:
lucide/dist/esm/icons/file-music.js:
lucide/dist/esm/icons/file-output.js:
lucide/dist/esm/icons/file-pen-line.js:
lucide/dist/esm/icons/file-pen.js:
lucide/dist/esm/icons/file-play.js:
lucide/dist/esm/icons/file-plus.js:
lucide/dist/esm/icons/file-plus-2.js:
lucide/dist/esm/icons/file-question-mark.js:
lucide/dist/esm/icons/file-scan.js:
lucide/dist/esm/icons/file-search-2.js:
lucide/dist/esm/icons/file-search.js:
lucide/dist/esm/icons/file-sliders.js:
lucide/dist/esm/icons/file-spreadsheet.js:
lucide/dist/esm/icons/file-stack.js:
lucide/dist/esm/icons/file-symlink.js:
lucide/dist/esm/icons/file-terminal.js:
lucide/dist/esm/icons/file-text.js:
lucide/dist/esm/icons/file-type-2.js:
lucide/dist/esm/icons/file-type.js:
lucide/dist/esm/icons/file-up.js:
lucide/dist/esm/icons/file-user.js:
lucide/dist/esm/icons/file-video-camera.js:
lucide/dist/esm/icons/file-volume-2.js:
lucide/dist/esm/icons/file-volume.js:
lucide/dist/esm/icons/file-warning.js:
lucide/dist/esm/icons/file-x-2.js:
lucide/dist/esm/icons/file-x.js:
lucide/dist/esm/icons/files.js:
lucide/dist/esm/icons/file.js:
lucide/dist/esm/icons/film.js:
lucide/dist/esm/icons/fingerprint.js:
lucide/dist/esm/icons/fire-extinguisher.js:
lucide/dist/esm/icons/fish-off.js:
lucide/dist/esm/icons/fish-symbol.js:
lucide/dist/esm/icons/flag-off.js:
lucide/dist/esm/icons/fish.js:
lucide/dist/esm/icons/flag-triangle-left.js:
lucide/dist/esm/icons/flag-triangle-right.js:
lucide/dist/esm/icons/flag.js:
lucide/dist/esm/icons/flame-kindling.js:
lucide/dist/esm/icons/flame.js:
lucide/dist/esm/icons/flashlight-off.js:
lucide/dist/esm/icons/flashlight.js:
lucide/dist/esm/icons/flask-conical-off.js:
lucide/dist/esm/icons/flask-conical.js:
lucide/dist/esm/icons/flask-round.js:
lucide/dist/esm/icons/flip-horizontal-2.js:
lucide/dist/esm/icons/flip-horizontal.js:
lucide/dist/esm/icons/flip-vertical-2.js:
lucide/dist/esm/icons/flip-vertical.js:
lucide/dist/esm/icons/flower-2.js:
lucide/dist/esm/icons/flower.js:
lucide/dist/esm/icons/focus.js:
lucide/dist/esm/icons/fold-horizontal.js:
lucide/dist/esm/icons/fold-vertical.js:
lucide/dist/esm/icons/folder-archive.js:
lucide/dist/esm/icons/folder-check.js:
lucide/dist/esm/icons/folder-clock.js:
lucide/dist/esm/icons/folder-closed.js:
lucide/dist/esm/icons/folder-code.js:
lucide/dist/esm/icons/folder-cog.js:
lucide/dist/esm/icons/folder-dot.js:
lucide/dist/esm/icons/folder-git-2.js:
lucide/dist/esm/icons/folder-down.js:
lucide/dist/esm/icons/folder-git.js:
lucide/dist/esm/icons/folder-heart.js:
lucide/dist/esm/icons/folder-input.js:
lucide/dist/esm/icons/folder-kanban.js:
lucide/dist/esm/icons/folder-key.js:
lucide/dist/esm/icons/folder-lock.js:
lucide/dist/esm/icons/folder-minus.js:
lucide/dist/esm/icons/folder-open-dot.js:
lucide/dist/esm/icons/folder-open.js:
lucide/dist/esm/icons/folder-output.js:
lucide/dist/esm/icons/folder-pen.js:
lucide/dist/esm/icons/folder-plus.js:
lucide/dist/esm/icons/folder-root.js:
lucide/dist/esm/icons/folder-search-2.js:
lucide/dist/esm/icons/folder-search.js:
lucide/dist/esm/icons/folder-symlink.js:
lucide/dist/esm/icons/folder-sync.js:
lucide/dist/esm/icons/folder-tree.js:
lucide/dist/esm/icons/folder-up.js:
lucide/dist/esm/icons/folder-x.js:
lucide/dist/esm/icons/folder.js:
lucide/dist/esm/icons/folders.js:
lucide/dist/esm/icons/footprints.js:
lucide/dist/esm/icons/forklift.js:
lucide/dist/esm/icons/forward.js:
lucide/dist/esm/icons/frame.js:
lucide/dist/esm/icons/framer.js:
lucide/dist/esm/icons/frown.js:
lucide/dist/esm/icons/fuel.js:
lucide/dist/esm/icons/fullscreen.js:
lucide/dist/esm/icons/funnel-plus.js:
lucide/dist/esm/icons/funnel-x.js:
lucide/dist/esm/icons/funnel.js:
lucide/dist/esm/icons/gallery-horizontal-end.js:
lucide/dist/esm/icons/gallery-horizontal.js:
lucide/dist/esm/icons/gallery-thumbnails.js:
lucide/dist/esm/icons/gallery-vertical-end.js:
lucide/dist/esm/icons/gallery-vertical.js:
lucide/dist/esm/icons/gamepad-2.js:
lucide/dist/esm/icons/gamepad-directional.js:
lucide/dist/esm/icons/gamepad.js:
lucide/dist/esm/icons/gauge.js:
lucide/dist/esm/icons/gavel.js:
lucide/dist/esm/icons/gem.js:
lucide/dist/esm/icons/georgian-lari.js:
lucide/dist/esm/icons/ghost.js:
lucide/dist/esm/icons/gift.js:
lucide/dist/esm/icons/git-branch-plus.js:
lucide/dist/esm/icons/git-branch.js:
lucide/dist/esm/icons/git-commit-horizontal.js:
lucide/dist/esm/icons/git-commit-vertical.js:
lucide/dist/esm/icons/git-compare-arrows.js:
lucide/dist/esm/icons/git-compare.js:
lucide/dist/esm/icons/git-fork.js:
lucide/dist/esm/icons/git-graph.js:
lucide/dist/esm/icons/git-merge.js:
lucide/dist/esm/icons/git-pull-request-arrow.js:
lucide/dist/esm/icons/git-pull-request-create-arrow.js:
lucide/dist/esm/icons/git-pull-request-closed.js:
lucide/dist/esm/icons/git-pull-request-create.js:
lucide/dist/esm/icons/git-pull-request-draft.js:
lucide/dist/esm/icons/git-pull-request.js:
lucide/dist/esm/icons/github.js:
lucide/dist/esm/icons/gitlab.js:
lucide/dist/esm/icons/glass-water.js:
lucide/dist/esm/icons/glasses.js:
lucide/dist/esm/icons/globe-lock.js:
lucide/dist/esm/icons/globe.js:
lucide/dist/esm/icons/goal.js:
lucide/dist/esm/icons/gpu.js:
lucide/dist/esm/icons/graduation-cap.js:
lucide/dist/esm/icons/grape.js:
lucide/dist/esm/icons/grid-2x2-check.js:
lucide/dist/esm/icons/grid-2x2-plus.js:
lucide/dist/esm/icons/grid-2x2-x.js:
lucide/dist/esm/icons/grid-2x2.js:
lucide/dist/esm/icons/grid-3x2.js:
lucide/dist/esm/icons/grid-3x3.js:
lucide/dist/esm/icons/grip-horizontal.js:
lucide/dist/esm/icons/grip-vertical.js:
lucide/dist/esm/icons/grip.js:
lucide/dist/esm/icons/group.js:
lucide/dist/esm/icons/guitar.js:
lucide/dist/esm/icons/ham.js:
lucide/dist/esm/icons/hamburger.js:
lucide/dist/esm/icons/hammer.js:
lucide/dist/esm/icons/hand-coins.js:
lucide/dist/esm/icons/hand-fist.js:
lucide/dist/esm/icons/hand-heart.js:
lucide/dist/esm/icons/hand-grab.js:
lucide/dist/esm/icons/hand-helping.js:
lucide/dist/esm/icons/hand-metal.js:
lucide/dist/esm/icons/hand-platter.js:
lucide/dist/esm/icons/hand.js:
lucide/dist/esm/icons/handbag.js:
lucide/dist/esm/icons/handshake.js:
lucide/dist/esm/icons/hard-drive-download.js:
lucide/dist/esm/icons/hard-drive-upload.js:
lucide/dist/esm/icons/hard-drive.js:
lucide/dist/esm/icons/hard-hat.js:
lucide/dist/esm/icons/hash.js:
lucide/dist/esm/icons/hat-glasses.js:
lucide/dist/esm/icons/haze.js:
lucide/dist/esm/icons/hdmi-port.js:
lucide/dist/esm/icons/heading-1.js:
lucide/dist/esm/icons/heading-2.js:
lucide/dist/esm/icons/heading-3.js:
lucide/dist/esm/icons/heading-4.js:
lucide/dist/esm/icons/heading-5.js:
lucide/dist/esm/icons/heading-6.js:
lucide/dist/esm/icons/heading.js:
lucide/dist/esm/icons/headphone-off.js:
lucide/dist/esm/icons/headphones.js:
lucide/dist/esm/icons/headset.js:
lucide/dist/esm/icons/heart-crack.js:
lucide/dist/esm/icons/heart-handshake.js:
lucide/dist/esm/icons/heart-minus.js:
lucide/dist/esm/icons/heart-off.js:
lucide/dist/esm/icons/heart-plus.js:
lucide/dist/esm/icons/heart-pulse.js:
lucide/dist/esm/icons/heart.js:
lucide/dist/esm/icons/heater.js:
lucide/dist/esm/icons/highlighter.js:
lucide/dist/esm/icons/hexagon.js:
lucide/dist/esm/icons/history.js:
lucide/dist/esm/icons/hop-off.js:
lucide/dist/esm/icons/hop.js:
lucide/dist/esm/icons/hospital.js:
lucide/dist/esm/icons/hotel.js:
lucide/dist/esm/icons/hourglass.js:
lucide/dist/esm/icons/house-plug.js:
lucide/dist/esm/icons/house-heart.js:
lucide/dist/esm/icons/house-wifi.js:
lucide/dist/esm/icons/house-plus.js:
lucide/dist/esm/icons/house.js:
lucide/dist/esm/icons/ice-cream-bowl.js:
lucide/dist/esm/icons/ice-cream-cone.js:
lucide/dist/esm/icons/id-card.js:
lucide/dist/esm/icons/id-card-lanyard.js:
lucide/dist/esm/icons/image-down.js:
lucide/dist/esm/icons/image-minus.js:
lucide/dist/esm/icons/image-off.js:
lucide/dist/esm/icons/image-play.js:
lucide/dist/esm/icons/image-plus.js:
lucide/dist/esm/icons/image-up.js:
lucide/dist/esm/icons/image-upscale.js:
lucide/dist/esm/icons/image.js:
lucide/dist/esm/icons/images.js:
lucide/dist/esm/icons/import.js:
lucide/dist/esm/icons/inbox.js:
lucide/dist/esm/icons/indian-rupee.js:
lucide/dist/esm/icons/info.js:
lucide/dist/esm/icons/infinity.js:
lucide/dist/esm/icons/inspection-panel.js:
lucide/dist/esm/icons/italic.js:
lucide/dist/esm/icons/iteration-ccw.js:
lucide/dist/esm/icons/instagram.js:
lucide/dist/esm/icons/iteration-cw.js:
lucide/dist/esm/icons/japanese-yen.js:
lucide/dist/esm/icons/joystick.js:
lucide/dist/esm/icons/kanban.js:
lucide/dist/esm/icons/kayak.js:
lucide/dist/esm/icons/key-round.js:
lucide/dist/esm/icons/key-square.js:
lucide/dist/esm/icons/key.js:
lucide/dist/esm/icons/keyboard-music.js:
lucide/dist/esm/icons/keyboard-off.js:
lucide/dist/esm/icons/keyboard.js:
lucide/dist/esm/icons/lamp-ceiling.js:
lucide/dist/esm/icons/lamp-desk.js:
lucide/dist/esm/icons/lamp-floor.js:
lucide/dist/esm/icons/lamp-wall-down.js:
lucide/dist/esm/icons/lamp-wall-up.js:
lucide/dist/esm/icons/lamp.js:
lucide/dist/esm/icons/land-plot.js:
lucide/dist/esm/icons/landmark.js:
lucide/dist/esm/icons/languages.js:
lucide/dist/esm/icons/laptop-minimal-check.js:
lucide/dist/esm/icons/laptop-minimal.js:
lucide/dist/esm/icons/laptop.js:
lucide/dist/esm/icons/lasso-select.js:
lucide/dist/esm/icons/lasso.js:
lucide/dist/esm/icons/laugh.js:
lucide/dist/esm/icons/layers-2.js:
lucide/dist/esm/icons/layers.js:
lucide/dist/esm/icons/layout-dashboard.js:
lucide/dist/esm/icons/layout-grid.js:
lucide/dist/esm/icons/layout-list.js:
lucide/dist/esm/icons/layout-panel-left.js:
lucide/dist/esm/icons/layout-panel-top.js:
lucide/dist/esm/icons/layout-template.js:
lucide/dist/esm/icons/leaf.js:
lucide/dist/esm/icons/leafy-green.js:
lucide/dist/esm/icons/lectern.js:
lucide/dist/esm/icons/library-big.js:
lucide/dist/esm/icons/life-buoy.js:
lucide/dist/esm/icons/library.js:
lucide/dist/esm/icons/ligature.js:
lucide/dist/esm/icons/lightbulb-off.js:
lucide/dist/esm/icons/lightbulb.js:
lucide/dist/esm/icons/line-squiggle.js:
lucide/dist/esm/icons/link-2-off.js:
lucide/dist/esm/icons/link-2.js:
lucide/dist/esm/icons/link.js:
lucide/dist/esm/icons/linkedin.js:
lucide/dist/esm/icons/list-check.js:
lucide/dist/esm/icons/list-checks.js:
lucide/dist/esm/icons/list-chevrons-down-up.js:
lucide/dist/esm/icons/list-chevrons-up-down.js:
lucide/dist/esm/icons/list-collapse.js:
lucide/dist/esm/icons/list-end.js:
lucide/dist/esm/icons/list-filter.js:
lucide/dist/esm/icons/list-filter-plus.js:
lucide/dist/esm/icons/list-indent-decrease.js:
lucide/dist/esm/icons/list-indent-increase.js:
lucide/dist/esm/icons/list-minus.js:
lucide/dist/esm/icons/list-music.js:
lucide/dist/esm/icons/list-plus.js:
lucide/dist/esm/icons/list-restart.js:
lucide/dist/esm/icons/list-ordered.js:
lucide/dist/esm/icons/list-start.js:
lucide/dist/esm/icons/list-todo.js:
lucide/dist/esm/icons/list-tree.js:
lucide/dist/esm/icons/list-video.js:
lucide/dist/esm/icons/list-x.js:
lucide/dist/esm/icons/list.js:
lucide/dist/esm/icons/loader-circle.js:
lucide/dist/esm/icons/loader-pinwheel.js:
lucide/dist/esm/icons/loader.js:
lucide/dist/esm/icons/locate-fixed.js:
lucide/dist/esm/icons/locate-off.js:
lucide/dist/esm/icons/locate.js:
lucide/dist/esm/icons/lock-keyhole-open.js:
lucide/dist/esm/icons/lock-keyhole.js:
lucide/dist/esm/icons/lock-open.js:
lucide/dist/esm/icons/lock.js:
lucide/dist/esm/icons/log-in.js:
lucide/dist/esm/icons/log-out.js:
lucide/dist/esm/icons/logs.js:
lucide/dist/esm/icons/lollipop.js:
lucide/dist/esm/icons/luggage.js:
lucide/dist/esm/icons/magnet.js:
lucide/dist/esm/icons/mail-check.js:
lucide/dist/esm/icons/mail-minus.js:
lucide/dist/esm/icons/mail-open.js:
lucide/dist/esm/icons/mail-plus.js:
lucide/dist/esm/icons/mail-question-mark.js:
lucide/dist/esm/icons/mail-search.js:
lucide/dist/esm/icons/mail-warning.js:
lucide/dist/esm/icons/mail-x.js:
lucide/dist/esm/icons/mail.js:
lucide/dist/esm/icons/mailbox.js:
lucide/dist/esm/icons/mails.js:
lucide/dist/esm/icons/map-minus.js:
lucide/dist/esm/icons/map-pin-check-inside.js:
lucide/dist/esm/icons/map-pin-check.js:
lucide/dist/esm/icons/map-pin-house.js:
lucide/dist/esm/icons/map-pin-minus.js:
lucide/dist/esm/icons/map-pin-minus-inside.js:
lucide/dist/esm/icons/map-pin-off.js:
lucide/dist/esm/icons/map-pin-pen.js:
lucide/dist/esm/icons/map-pin-plus-inside.js:
lucide/dist/esm/icons/map-pin-plus.js:
lucide/dist/esm/icons/map-pin-x-inside.js:
lucide/dist/esm/icons/map-pin-x.js:
lucide/dist/esm/icons/map-pin.js:
lucide/dist/esm/icons/map-pinned.js:
lucide/dist/esm/icons/map.js:
lucide/dist/esm/icons/map-plus.js:
lucide/dist/esm/icons/mars-stroke.js:
lucide/dist/esm/icons/mars.js:
lucide/dist/esm/icons/martini.js:
lucide/dist/esm/icons/maximize-2.js:
lucide/dist/esm/icons/maximize.js:
lucide/dist/esm/icons/medal.js:
lucide/dist/esm/icons/megaphone-off.js:
lucide/dist/esm/icons/megaphone.js:
lucide/dist/esm/icons/meh.js:
lucide/dist/esm/icons/memory-stick.js:
lucide/dist/esm/icons/menu.js:
lucide/dist/esm/icons/merge.js:
lucide/dist/esm/icons/message-circle-code.js:
lucide/dist/esm/icons/message-circle-dashed.js:
lucide/dist/esm/icons/message-circle-heart.js:
lucide/dist/esm/icons/message-circle-more.js:
lucide/dist/esm/icons/message-circle-off.js:
lucide/dist/esm/icons/message-circle-plus.js:
lucide/dist/esm/icons/message-circle-question-mark.js:
lucide/dist/esm/icons/message-circle-reply.js:
lucide/dist/esm/icons/message-circle-warning.js:
lucide/dist/esm/icons/message-circle-x.js:
lucide/dist/esm/icons/message-circle.js:
lucide/dist/esm/icons/message-square-code.js:
lucide/dist/esm/icons/message-square-dashed.js:
lucide/dist/esm/icons/message-square-diff.js:
lucide/dist/esm/icons/message-square-dot.js:
lucide/dist/esm/icons/message-square-heart.js:
lucide/dist/esm/icons/message-square-lock.js:
lucide/dist/esm/icons/message-square-more.js:
lucide/dist/esm/icons/message-square-off.js:
lucide/dist/esm/icons/message-square-plus.js:
lucide/dist/esm/icons/message-square-quote.js:
lucide/dist/esm/icons/message-square-share.js:
lucide/dist/esm/icons/message-square-reply.js:
lucide/dist/esm/icons/message-square-text.js:
lucide/dist/esm/icons/message-square-warning.js:
lucide/dist/esm/icons/message-square-x.js:
lucide/dist/esm/icons/message-square.js:
lucide/dist/esm/icons/messages-square.js:
lucide/dist/esm/icons/mic-off.js:
lucide/dist/esm/icons/mic-vocal.js:
lucide/dist/esm/icons/mic.js:
lucide/dist/esm/icons/microchip.js:
lucide/dist/esm/icons/microscope.js:
lucide/dist/esm/icons/microwave.js:
lucide/dist/esm/icons/milestone.js:
lucide/dist/esm/icons/milk.js:
lucide/dist/esm/icons/milk-off.js:
lucide/dist/esm/icons/minimize-2.js:
lucide/dist/esm/icons/minimize.js:
lucide/dist/esm/icons/minus.js:
lucide/dist/esm/icons/monitor-check.js:
lucide/dist/esm/icons/monitor-cloud.js:
lucide/dist/esm/icons/monitor-cog.js:
lucide/dist/esm/icons/monitor-dot.js:
lucide/dist/esm/icons/monitor-down.js:
lucide/dist/esm/icons/monitor-off.js:
lucide/dist/esm/icons/monitor-pause.js:
lucide/dist/esm/icons/monitor-play.js:
lucide/dist/esm/icons/monitor-smartphone.js:
lucide/dist/esm/icons/monitor-speaker.js:
lucide/dist/esm/icons/monitor-stop.js:
lucide/dist/esm/icons/monitor-up.js:
lucide/dist/esm/icons/monitor-x.js:
lucide/dist/esm/icons/monitor.js:
lucide/dist/esm/icons/moon-star.js:
lucide/dist/esm/icons/moon.js:
lucide/dist/esm/icons/motorbike.js:
lucide/dist/esm/icons/mountain-snow.js:
lucide/dist/esm/icons/mountain.js:
lucide/dist/esm/icons/mouse-off.js:
lucide/dist/esm/icons/mouse-pointer-2.js:
lucide/dist/esm/icons/mouse-pointer-ban.js:
lucide/dist/esm/icons/mouse-pointer-click.js:
lucide/dist/esm/icons/mouse-pointer.js:
lucide/dist/esm/icons/mouse.js:
lucide/dist/esm/icons/move-3d.js:
lucide/dist/esm/icons/move-diagonal-2.js:
lucide/dist/esm/icons/move-diagonal.js:
lucide/dist/esm/icons/move-down-left.js:
lucide/dist/esm/icons/move-down-right.js:
lucide/dist/esm/icons/move-down.js:
lucide/dist/esm/icons/move-horizontal.js:
lucide/dist/esm/icons/move-left.js:
lucide/dist/esm/icons/move-right.js:
lucide/dist/esm/icons/move-up-left.js:
lucide/dist/esm/icons/move-up-right.js:
lucide/dist/esm/icons/move-up.js:
lucide/dist/esm/icons/move-vertical.js:
lucide/dist/esm/icons/move.js:
lucide/dist/esm/icons/music-2.js:
lucide/dist/esm/icons/music-3.js:
lucide/dist/esm/icons/music-4.js:
lucide/dist/esm/icons/music.js:
lucide/dist/esm/icons/navigation-2-off.js:
lucide/dist/esm/icons/navigation-2.js:
lucide/dist/esm/icons/navigation-off.js:
lucide/dist/esm/icons/navigation.js:
lucide/dist/esm/icons/network.js:
lucide/dist/esm/icons/newspaper.js:
lucide/dist/esm/icons/nfc.js:
lucide/dist/esm/icons/non-binary.js:
lucide/dist/esm/icons/notebook-pen.js:
lucide/dist/esm/icons/notebook-tabs.js:
lucide/dist/esm/icons/notebook-text.js:
lucide/dist/esm/icons/notebook.js:
lucide/dist/esm/icons/notepad-text-dashed.js:
lucide/dist/esm/icons/notepad-text.js:
lucide/dist/esm/icons/nut-off.js:
lucide/dist/esm/icons/nut.js:
lucide/dist/esm/icons/octagon-alert.js:
lucide/dist/esm/icons/octagon-minus.js:
lucide/dist/esm/icons/octagon-pause.js:
lucide/dist/esm/icons/octagon-x.js:
lucide/dist/esm/icons/octagon.js:
lucide/dist/esm/icons/omega.js:
lucide/dist/esm/icons/option.js:
lucide/dist/esm/icons/orbit.js:
lucide/dist/esm/icons/origami.js:
lucide/dist/esm/icons/package-2.js:
lucide/dist/esm/icons/package-check.js:
lucide/dist/esm/icons/package-minus.js:
lucide/dist/esm/icons/package-open.js:
lucide/dist/esm/icons/package-plus.js:
lucide/dist/esm/icons/package-search.js:
lucide/dist/esm/icons/package-x.js:
lucide/dist/esm/icons/package.js:
lucide/dist/esm/icons/paint-bucket.js:
lucide/dist/esm/icons/paint-roller.js:
lucide/dist/esm/icons/paintbrush-vertical.js:
lucide/dist/esm/icons/paintbrush.js:
lucide/dist/esm/icons/palette.js:
lucide/dist/esm/icons/panda.js:
lucide/dist/esm/icons/panel-bottom-close.js:
lucide/dist/esm/icons/panel-bottom-dashed.js:
lucide/dist/esm/icons/panel-bottom-open.js:
lucide/dist/esm/icons/panel-bottom.js:
lucide/dist/esm/icons/panel-left-close.js:
lucide/dist/esm/icons/panel-left-dashed.js:
lucide/dist/esm/icons/panel-left-open.js:
lucide/dist/esm/icons/panel-left-right-dashed.js:
lucide/dist/esm/icons/panel-left.js:
lucide/dist/esm/icons/panel-right-close.js:
lucide/dist/esm/icons/panel-right.js:
lucide/dist/esm/icons/panel-right-open.js:
lucide/dist/esm/icons/panel-right-dashed.js:
lucide/dist/esm/icons/panel-top-bottom-dashed.js:
lucide/dist/esm/icons/panel-top-close.js:
lucide/dist/esm/icons/panel-top-dashed.js:
lucide/dist/esm/icons/panel-top-open.js:
lucide/dist/esm/icons/panels-left-bottom.js:
lucide/dist/esm/icons/panel-top.js:
lucide/dist/esm/icons/panels-right-bottom.js:
lucide/dist/esm/icons/panels-top-left.js:
lucide/dist/esm/icons/paperclip.js:
lucide/dist/esm/icons/parking-meter.js:
lucide/dist/esm/icons/parentheses.js:
lucide/dist/esm/icons/party-popper.js:
lucide/dist/esm/icons/pause.js:
lucide/dist/esm/icons/paw-print.js:
lucide/dist/esm/icons/pc-case.js:
lucide/dist/esm/icons/pen-line.js:
lucide/dist/esm/icons/pen-off.js:
lucide/dist/esm/icons/pen-tool.js:
lucide/dist/esm/icons/pen.js:
lucide/dist/esm/icons/pencil-line.js:
lucide/dist/esm/icons/pencil-off.js:
lucide/dist/esm/icons/pencil-ruler.js:
lucide/dist/esm/icons/pencil.js:
lucide/dist/esm/icons/pentagon.js:
lucide/dist/esm/icons/percent.js:
lucide/dist/esm/icons/person-standing.js:
lucide/dist/esm/icons/philippine-peso.js:
lucide/dist/esm/icons/phone-call.js:
lucide/dist/esm/icons/phone-forwarded.js:
lucide/dist/esm/icons/phone-incoming.js:
lucide/dist/esm/icons/phone-missed.js:
lucide/dist/esm/icons/phone-off.js:
lucide/dist/esm/icons/phone-outgoing.js:
lucide/dist/esm/icons/phone.js:
lucide/dist/esm/icons/pi.js:
lucide/dist/esm/icons/piano.js:
lucide/dist/esm/icons/pickaxe.js:
lucide/dist/esm/icons/picture-in-picture-2.js:
lucide/dist/esm/icons/picture-in-picture.js:
lucide/dist/esm/icons/pilcrow-left.js:
lucide/dist/esm/icons/piggy-bank.js:
lucide/dist/esm/icons/pilcrow-right.js:
lucide/dist/esm/icons/pilcrow.js:
lucide/dist/esm/icons/pill-bottle.js:
lucide/dist/esm/icons/pill.js:
lucide/dist/esm/icons/pin.js:
lucide/dist/esm/icons/pipette.js:
lucide/dist/esm/icons/pin-off.js:
lucide/dist/esm/icons/pizza.js:
lucide/dist/esm/icons/plane-landing.js:
lucide/dist/esm/icons/plane-takeoff.js:
lucide/dist/esm/icons/plane.js:
lucide/dist/esm/icons/play.js:
lucide/dist/esm/icons/plug-2.js:
lucide/dist/esm/icons/plug-zap.js:
lucide/dist/esm/icons/plug.js:
lucide/dist/esm/icons/plus.js:
lucide/dist/esm/icons/pocket-knife.js:
lucide/dist/esm/icons/pocket.js:
lucide/dist/esm/icons/podcast.js:
lucide/dist/esm/icons/pointer-off.js:
lucide/dist/esm/icons/pointer.js:
lucide/dist/esm/icons/popcorn.js:
lucide/dist/esm/icons/popsicle.js:
lucide/dist/esm/icons/pound-sterling.js:
lucide/dist/esm/icons/power-off.js:
lucide/dist/esm/icons/power.js:
lucide/dist/esm/icons/presentation.js:
lucide/dist/esm/icons/printer-check.js:
lucide/dist/esm/icons/printer.js:
lucide/dist/esm/icons/projector.js:
lucide/dist/esm/icons/proportions.js:
lucide/dist/esm/icons/puzzle.js:
lucide/dist/esm/icons/qr-code.js:
lucide/dist/esm/icons/pyramid.js:
lucide/dist/esm/icons/quote.js:
lucide/dist/esm/icons/rabbit.js:
lucide/dist/esm/icons/radar.js:
lucide/dist/esm/icons/radiation.js:
lucide/dist/esm/icons/radical.js:
lucide/dist/esm/icons/radio-receiver.js:
lucide/dist/esm/icons/radio-tower.js:
lucide/dist/esm/icons/radio.js:
lucide/dist/esm/icons/radius.js:
lucide/dist/esm/icons/rail-symbol.js:
lucide/dist/esm/icons/rat.js:
lucide/dist/esm/icons/rainbow.js:
lucide/dist/esm/icons/ratio.js:
lucide/dist/esm/icons/receipt-cent.js:
lucide/dist/esm/icons/receipt-euro.js:
lucide/dist/esm/icons/receipt-indian-rupee.js:
lucide/dist/esm/icons/receipt-japanese-yen.js:
lucide/dist/esm/icons/receipt-pound-sterling.js:
lucide/dist/esm/icons/receipt-russian-ruble.js:
lucide/dist/esm/icons/receipt-swiss-franc.js:
lucide/dist/esm/icons/receipt-text.js:
lucide/dist/esm/icons/receipt.js:
lucide/dist/esm/icons/receipt-turkish-lira.js:
lucide/dist/esm/icons/rectangle-circle.js:
lucide/dist/esm/icons/rectangle-ellipsis.js:
lucide/dist/esm/icons/rectangle-goggles.js:
lucide/dist/esm/icons/rectangle-horizontal.js:
lucide/dist/esm/icons/rectangle-vertical.js:
lucide/dist/esm/icons/recycle.js:
lucide/dist/esm/icons/redo-2.js:
lucide/dist/esm/icons/redo-dot.js:
lucide/dist/esm/icons/redo.js:
lucide/dist/esm/icons/refresh-ccw-dot.js:
lucide/dist/esm/icons/refresh-ccw.js:
lucide/dist/esm/icons/refresh-cw-off.js:
lucide/dist/esm/icons/refresh-cw.js:
lucide/dist/esm/icons/refrigerator.js:
lucide/dist/esm/icons/regex.js:
lucide/dist/esm/icons/remove-formatting.js:
lucide/dist/esm/icons/repeat-1.js:
lucide/dist/esm/icons/repeat-2.js:
lucide/dist/esm/icons/repeat.js:
lucide/dist/esm/icons/replace-all.js:
lucide/dist/esm/icons/replace.js:
lucide/dist/esm/icons/reply-all.js:
lucide/dist/esm/icons/reply.js:
lucide/dist/esm/icons/rewind.js:
lucide/dist/esm/icons/ribbon.js:
lucide/dist/esm/icons/rocket.js:
lucide/dist/esm/icons/rocking-chair.js:
lucide/dist/esm/icons/roller-coaster.js:
lucide/dist/esm/icons/rose.js:
lucide/dist/esm/icons/rotate-3d.js:
lucide/dist/esm/icons/rotate-ccw-key.js:
lucide/dist/esm/icons/rotate-ccw-square.js:
lucide/dist/esm/icons/rotate-ccw.js:
lucide/dist/esm/icons/rotate-cw-square.js:
lucide/dist/esm/icons/rotate-cw.js:
lucide/dist/esm/icons/route-off.js:
lucide/dist/esm/icons/route.js:
lucide/dist/esm/icons/router.js:
lucide/dist/esm/icons/rows-2.js:
lucide/dist/esm/icons/rows-3.js:
lucide/dist/esm/icons/rss.js:
lucide/dist/esm/icons/rows-4.js:
lucide/dist/esm/icons/ruler-dimension-line.js:
lucide/dist/esm/icons/ruler.js:
lucide/dist/esm/icons/russian-ruble.js:
lucide/dist/esm/icons/sailboat.js:
lucide/dist/esm/icons/salad.js:
lucide/dist/esm/icons/sandwich.js:
lucide/dist/esm/icons/satellite-dish.js:
lucide/dist/esm/icons/satellite.js:
lucide/dist/esm/icons/saudi-riyal.js:
lucide/dist/esm/icons/save-all.js:
lucide/dist/esm/icons/save-off.js:
lucide/dist/esm/icons/save.js:
lucide/dist/esm/icons/scale-3d.js:
lucide/dist/esm/icons/scale.js:
lucide/dist/esm/icons/scaling.js:
lucide/dist/esm/icons/scan-barcode.js:
lucide/dist/esm/icons/scan-eye.js:
lucide/dist/esm/icons/scan-face.js:
lucide/dist/esm/icons/scan-heart.js:
lucide/dist/esm/icons/scan-line.js:
lucide/dist/esm/icons/scan-qr-code.js:
lucide/dist/esm/icons/scan-search.js:
lucide/dist/esm/icons/scan-text.js:
lucide/dist/esm/icons/scan.js:
lucide/dist/esm/icons/school.js:
lucide/dist/esm/icons/scissors-line-dashed.js:
lucide/dist/esm/icons/scissors.js:
lucide/dist/esm/icons/screen-share-off.js:
lucide/dist/esm/icons/screen-share.js:
lucide/dist/esm/icons/scroll-text.js:
lucide/dist/esm/icons/scroll.js:
lucide/dist/esm/icons/search-code.js:
lucide/dist/esm/icons/search-check.js:
lucide/dist/esm/icons/search-slash.js:
lucide/dist/esm/icons/search-x.js:
lucide/dist/esm/icons/search.js:
lucide/dist/esm/icons/section.js:
lucide/dist/esm/icons/send-horizontal.js:
lucide/dist/esm/icons/send-to-back.js:
lucide/dist/esm/icons/send.js:
lucide/dist/esm/icons/separator-horizontal.js:
lucide/dist/esm/icons/server-cog.js:
lucide/dist/esm/icons/separator-vertical.js:
lucide/dist/esm/icons/server-crash.js:
lucide/dist/esm/icons/server-off.js:
lucide/dist/esm/icons/server.js:
lucide/dist/esm/icons/settings-2.js:
lucide/dist/esm/icons/settings.js:
lucide/dist/esm/icons/shapes.js:
lucide/dist/esm/icons/share-2.js:
lucide/dist/esm/icons/share.js:
lucide/dist/esm/icons/shell.js:
lucide/dist/esm/icons/sheet.js:
lucide/dist/esm/icons/shield-ban.js:
lucide/dist/esm/icons/shield-alert.js:
lucide/dist/esm/icons/shield-check.js:
lucide/dist/esm/icons/shield-ellipsis.js:
lucide/dist/esm/icons/shield-half.js:
lucide/dist/esm/icons/shield-minus.js:
lucide/dist/esm/icons/shield-off.js:
lucide/dist/esm/icons/shield-plus.js:
lucide/dist/esm/icons/shield-question-mark.js:
lucide/dist/esm/icons/shield-user.js:
lucide/dist/esm/icons/shield-x.js:
lucide/dist/esm/icons/shield.js:
lucide/dist/esm/icons/ship-wheel.js:
lucide/dist/esm/icons/ship.js:
lucide/dist/esm/icons/shirt.js:
lucide/dist/esm/icons/shopping-bag.js:
lucide/dist/esm/icons/shopping-basket.js:
lucide/dist/esm/icons/shopping-cart.js:
lucide/dist/esm/icons/shovel.js:
lucide/dist/esm/icons/shower-head.js:
lucide/dist/esm/icons/shredder.js:
lucide/dist/esm/icons/shrimp.js:
lucide/dist/esm/icons/shrink.js:
lucide/dist/esm/icons/shrub.js:
lucide/dist/esm/icons/shuffle.js:
lucide/dist/esm/icons/sigma.js:
lucide/dist/esm/icons/signal-high.js:
lucide/dist/esm/icons/signal-low.js:
lucide/dist/esm/icons/signal-medium.js:
lucide/dist/esm/icons/signal-zero.js:
lucide/dist/esm/icons/signal.js:
lucide/dist/esm/icons/signature.js:
lucide/dist/esm/icons/signpost-big.js:
lucide/dist/esm/icons/signpost.js:
lucide/dist/esm/icons/siren.js:
lucide/dist/esm/icons/skip-back.js:
lucide/dist/esm/icons/skip-forward.js:
lucide/dist/esm/icons/skull.js:
lucide/dist/esm/icons/slack.js:
lucide/dist/esm/icons/slash.js:
lucide/dist/esm/icons/slice.js:
lucide/dist/esm/icons/sliders-horizontal.js:
lucide/dist/esm/icons/smartphone-charging.js:
lucide/dist/esm/icons/sliders-vertical.js:
lucide/dist/esm/icons/smartphone-nfc.js:
lucide/dist/esm/icons/smartphone.js:
lucide/dist/esm/icons/smile-plus.js:
lucide/dist/esm/icons/smile.js:
lucide/dist/esm/icons/snail.js:
lucide/dist/esm/icons/soap-dispenser-droplet.js:
lucide/dist/esm/icons/snowflake.js:
lucide/dist/esm/icons/sofa.js:
lucide/dist/esm/icons/soup.js:
lucide/dist/esm/icons/space.js:
lucide/dist/esm/icons/spade.js:
lucide/dist/esm/icons/sparkle.js:
lucide/dist/esm/icons/sparkles.js:
lucide/dist/esm/icons/speaker.js:
lucide/dist/esm/icons/speech.js:
lucide/dist/esm/icons/spell-check-2.js:
lucide/dist/esm/icons/spell-check.js:
lucide/dist/esm/icons/spline-pointer.js:
lucide/dist/esm/icons/spline.js:
lucide/dist/esm/icons/split.js:
lucide/dist/esm/icons/spool.js:
lucide/dist/esm/icons/spotlight.js:
lucide/dist/esm/icons/spray-can.js:
lucide/dist/esm/icons/sprout.js:
lucide/dist/esm/icons/square-activity.js:
lucide/dist/esm/icons/square-arrow-down-left.js:
lucide/dist/esm/icons/square-arrow-down-right.js:
lucide/dist/esm/icons/square-arrow-down.js:
lucide/dist/esm/icons/square-arrow-left.js:
lucide/dist/esm/icons/square-arrow-out-down-left.js:
lucide/dist/esm/icons/square-arrow-out-down-right.js:
lucide/dist/esm/icons/square-arrow-out-up-left.js:
lucide/dist/esm/icons/square-arrow-out-up-right.js:
lucide/dist/esm/icons/square-arrow-right.js:
lucide/dist/esm/icons/square-arrow-up-left.js:
lucide/dist/esm/icons/square-arrow-up-right.js:
lucide/dist/esm/icons/square-arrow-up.js:
lucide/dist/esm/icons/square-asterisk.js:
lucide/dist/esm/icons/square-bottom-dashed-scissors.js:
lucide/dist/esm/icons/square-chart-gantt.js:
lucide/dist/esm/icons/square-check-big.js:
lucide/dist/esm/icons/square-check.js:
lucide/dist/esm/icons/square-chevron-down.js:
lucide/dist/esm/icons/square-chevron-left.js:
lucide/dist/esm/icons/square-chevron-right.js:
lucide/dist/esm/icons/square-chevron-up.js:
lucide/dist/esm/icons/square-code.js:
lucide/dist/esm/icons/square-dashed-bottom-code.js:
lucide/dist/esm/icons/square-dashed-bottom.js:
lucide/dist/esm/icons/square-dashed-kanban.js:
lucide/dist/esm/icons/square-dashed-mouse-pointer.js:
lucide/dist/esm/icons/square-dashed.js:
lucide/dist/esm/icons/square-dashed-top-solid.js:
lucide/dist/esm/icons/square-divide.js:
lucide/dist/esm/icons/square-dot.js:
lucide/dist/esm/icons/square-equal.js:
lucide/dist/esm/icons/square-function.js:
lucide/dist/esm/icons/square-kanban.js:
lucide/dist/esm/icons/square-library.js:
lucide/dist/esm/icons/square-m.js:
lucide/dist/esm/icons/square-menu.js:
lucide/dist/esm/icons/square-minus.js:
lucide/dist/esm/icons/square-mouse-pointer.js:
lucide/dist/esm/icons/square-parking-off.js:
lucide/dist/esm/icons/square-parking.js:
lucide/dist/esm/icons/square-pen.js:
lucide/dist/esm/icons/square-pause.js:
lucide/dist/esm/icons/square-percent.js:
lucide/dist/esm/icons/square-pi.js:
lucide/dist/esm/icons/square-pilcrow.js:
lucide/dist/esm/icons/square-play.js:
lucide/dist/esm/icons/square-plus.js:
lucide/dist/esm/icons/square-power.js:
lucide/dist/esm/icons/square-radical.js:
lucide/dist/esm/icons/square-scissors.js:
lucide/dist/esm/icons/square-round-corner.js:
lucide/dist/esm/icons/square-sigma.js:
lucide/dist/esm/icons/square-slash.js:
lucide/dist/esm/icons/square-split-horizontal.js:
lucide/dist/esm/icons/square-split-vertical.js:
lucide/dist/esm/icons/square-square.js:
lucide/dist/esm/icons/square-stack.js:
lucide/dist/esm/icons/square-star.js:
lucide/dist/esm/icons/square-stop.js:
lucide/dist/esm/icons/square-terminal.js:
lucide/dist/esm/icons/square-user-round.js:
lucide/dist/esm/icons/square-user.js:
lucide/dist/esm/icons/square-x.js:
lucide/dist/esm/icons/square.js:
lucide/dist/esm/icons/squares-exclude.js:
lucide/dist/esm/icons/squares-subtract.js:
lucide/dist/esm/icons/squares-intersect.js:
lucide/dist/esm/icons/squares-unite.js:
lucide/dist/esm/icons/squircle-dashed.js:
lucide/dist/esm/icons/squircle.js:
lucide/dist/esm/icons/squirrel.js:
lucide/dist/esm/icons/stamp.js:
lucide/dist/esm/icons/star-half.js:
lucide/dist/esm/icons/star-off.js:
lucide/dist/esm/icons/star.js:
lucide/dist/esm/icons/step-back.js:
lucide/dist/esm/icons/step-forward.js:
lucide/dist/esm/icons/stethoscope.js:
lucide/dist/esm/icons/sticker.js:
lucide/dist/esm/icons/sticky-note.js:
lucide/dist/esm/icons/store.js:
lucide/dist/esm/icons/stretch-horizontal.js:
lucide/dist/esm/icons/stretch-vertical.js:
lucide/dist/esm/icons/strikethrough.js:
lucide/dist/esm/icons/subscript.js:
lucide/dist/esm/icons/sun-dim.js:
lucide/dist/esm/icons/sun-medium.js:
lucide/dist/esm/icons/sun-moon.js:
lucide/dist/esm/icons/sun-snow.js:
lucide/dist/esm/icons/sun.js:
lucide/dist/esm/icons/sunrise.js:
lucide/dist/esm/icons/sunset.js:
lucide/dist/esm/icons/superscript.js:
lucide/dist/esm/icons/swatch-book.js:
lucide/dist/esm/icons/swiss-franc.js:
lucide/dist/esm/icons/switch-camera.js:
lucide/dist/esm/icons/sword.js:
lucide/dist/esm/icons/swords.js:
lucide/dist/esm/icons/syringe.js:
lucide/dist/esm/icons/table-2.js:
lucide/dist/esm/icons/table-cells-merge.js:
lucide/dist/esm/icons/table-cells-split.js:
lucide/dist/esm/icons/table-columns-split.js:
lucide/dist/esm/icons/table-of-contents.js:
lucide/dist/esm/icons/table-properties.js:
lucide/dist/esm/icons/table-rows-split.js:
lucide/dist/esm/icons/table.js:
lucide/dist/esm/icons/tablet-smartphone.js:
lucide/dist/esm/icons/tablet.js:
lucide/dist/esm/icons/tablets.js:
lucide/dist/esm/icons/tag.js:
lucide/dist/esm/icons/tags.js:
lucide/dist/esm/icons/tally-1.js:
lucide/dist/esm/icons/tally-2.js:
lucide/dist/esm/icons/tally-3.js:
lucide/dist/esm/icons/tally-4.js:
lucide/dist/esm/icons/tally-5.js:
lucide/dist/esm/icons/target.js:
lucide/dist/esm/icons/tangent.js:
lucide/dist/esm/icons/telescope.js:
lucide/dist/esm/icons/tent-tree.js:
lucide/dist/esm/icons/tent.js:
lucide/dist/esm/icons/terminal.js:
lucide/dist/esm/icons/test-tube-diagonal.js:
lucide/dist/esm/icons/test-tubes.js:
lucide/dist/esm/icons/test-tube.js:
lucide/dist/esm/icons/text-align-center.js:
lucide/dist/esm/icons/text-align-justify.js:
lucide/dist/esm/icons/text-align-end.js:
lucide/dist/esm/icons/text-align-start.js:
lucide/dist/esm/icons/text-cursor-input.js:
lucide/dist/esm/icons/text-initial.js:
lucide/dist/esm/icons/text-cursor.js:
lucide/dist/esm/icons/text-quote.js:
lucide/dist/esm/icons/text-search.js:
lucide/dist/esm/icons/text-select.js:
lucide/dist/esm/icons/text-wrap.js:
lucide/dist/esm/icons/theater.js:
lucide/dist/esm/icons/thermometer-snowflake.js:
lucide/dist/esm/icons/thermometer-sun.js:
lucide/dist/esm/icons/thermometer.js:
lucide/dist/esm/icons/thumbs-down.js:
lucide/dist/esm/icons/thumbs-up.js:
lucide/dist/esm/icons/ticket-check.js:
lucide/dist/esm/icons/ticket-minus.js:
lucide/dist/esm/icons/ticket-percent.js:
lucide/dist/esm/icons/ticket-plus.js:
lucide/dist/esm/icons/ticket-slash.js:
lucide/dist/esm/icons/ticket-x.js:
lucide/dist/esm/icons/ticket.js:
lucide/dist/esm/icons/tickets-plane.js:
lucide/dist/esm/icons/tickets.js:
lucide/dist/esm/icons/timer-off.js:
lucide/dist/esm/icons/timer-reset.js:
lucide/dist/esm/icons/timer.js:
lucide/dist/esm/icons/toggle-left.js:
lucide/dist/esm/icons/toggle-right.js:
lucide/dist/esm/icons/toilet.js:
lucide/dist/esm/icons/tool-case.js:
lucide/dist/esm/icons/tornado.js:
lucide/dist/esm/icons/touchpad-off.js:
lucide/dist/esm/icons/touchpad.js:
lucide/dist/esm/icons/torus.js:
lucide/dist/esm/icons/tower-control.js:
lucide/dist/esm/icons/toy-brick.js:
lucide/dist/esm/icons/tractor.js:
lucide/dist/esm/icons/traffic-cone.js:
lucide/dist/esm/icons/train-front.js:
lucide/dist/esm/icons/train-front-tunnel.js:
lucide/dist/esm/icons/tram-front.js:
lucide/dist/esm/icons/train-track.js:
lucide/dist/esm/icons/transgender.js:
lucide/dist/esm/icons/trash-2.js:
lucide/dist/esm/icons/trash.js:
lucide/dist/esm/icons/tree-deciduous.js:
lucide/dist/esm/icons/tree-palm.js:
lucide/dist/esm/icons/tree-pine.js:
lucide/dist/esm/icons/trees.js:
lucide/dist/esm/icons/trending-down.js:
lucide/dist/esm/icons/trello.js:
lucide/dist/esm/icons/trending-up-down.js:
lucide/dist/esm/icons/trending-up.js:
lucide/dist/esm/icons/triangle-alert.js:
lucide/dist/esm/icons/triangle-dashed.js:
lucide/dist/esm/icons/triangle.js:
lucide/dist/esm/icons/triangle-right.js:
lucide/dist/esm/icons/trophy.js:
lucide/dist/esm/icons/truck-electric.js:
lucide/dist/esm/icons/truck.js:
lucide/dist/esm/icons/turkish-lira.js:
lucide/dist/esm/icons/turntable.js:
lucide/dist/esm/icons/turtle.js:
lucide/dist/esm/icons/tv-minimal-play.js:
lucide/dist/esm/icons/tv-minimal.js:
lucide/dist/esm/icons/twitch.js:
lucide/dist/esm/icons/tv.js:
lucide/dist/esm/icons/twitter.js:
lucide/dist/esm/icons/type-outline.js:
lucide/dist/esm/icons/type.js:
lucide/dist/esm/icons/umbrella-off.js:
lucide/dist/esm/icons/umbrella.js:
lucide/dist/esm/icons/underline.js:
lucide/dist/esm/icons/undo-2.js:
lucide/dist/esm/icons/undo.js:
lucide/dist/esm/icons/undo-dot.js:
lucide/dist/esm/icons/unfold-horizontal.js:
lucide/dist/esm/icons/unfold-vertical.js:
lucide/dist/esm/icons/ungroup.js:
lucide/dist/esm/icons/university.js:
lucide/dist/esm/icons/unlink-2.js:
lucide/dist/esm/icons/unlink.js:
lucide/dist/esm/icons/upload.js:
lucide/dist/esm/icons/unplug.js:
lucide/dist/esm/icons/user-check.js:
lucide/dist/esm/icons/usb.js:
lucide/dist/esm/icons/user-cog.js:
lucide/dist/esm/icons/user-lock.js:
lucide/dist/esm/icons/user-minus.js:
lucide/dist/esm/icons/user-pen.js:
lucide/dist/esm/icons/user-plus.js:
lucide/dist/esm/icons/user-round-check.js:
lucide/dist/esm/icons/user-round-cog.js:
lucide/dist/esm/icons/user-round-minus.js:
lucide/dist/esm/icons/user-round-pen.js:
lucide/dist/esm/icons/user-round-plus.js:
lucide/dist/esm/icons/user-round-search.js:
lucide/dist/esm/icons/user-round-x.js:
lucide/dist/esm/icons/user-round.js:
lucide/dist/esm/icons/user-search.js:
lucide/dist/esm/icons/user-star.js:
lucide/dist/esm/icons/user-x.js:
lucide/dist/esm/icons/user.js:
lucide/dist/esm/icons/users-round.js:
lucide/dist/esm/icons/users.js:
lucide/dist/esm/icons/utensils-crossed.js:
lucide/dist/esm/icons/utensils.js:
lucide/dist/esm/icons/variable.js:
lucide/dist/esm/icons/utility-pole.js:
lucide/dist/esm/icons/vault.js:
lucide/dist/esm/icons/vector-square.js:
lucide/dist/esm/icons/vegan.js:
lucide/dist/esm/icons/venetian-mask.js:
lucide/dist/esm/icons/venus-and-mars.js:
lucide/dist/esm/icons/venus.js:
lucide/dist/esm/icons/vibrate-off.js:
lucide/dist/esm/icons/vibrate.js:
lucide/dist/esm/icons/video-off.js:
lucide/dist/esm/icons/video.js:
lucide/dist/esm/icons/videotape.js:
lucide/dist/esm/icons/view.js:
lucide/dist/esm/icons/voicemail.js:
lucide/dist/esm/icons/volleyball.js:
lucide/dist/esm/icons/volume-1.js:
lucide/dist/esm/icons/volume-2.js:
lucide/dist/esm/icons/volume-off.js:
lucide/dist/esm/icons/volume-x.js:
lucide/dist/esm/icons/volume.js:
lucide/dist/esm/icons/vote.js:
lucide/dist/esm/icons/wallet-cards.js:
lucide/dist/esm/icons/wallet-minimal.js:
lucide/dist/esm/icons/wallet.js:
lucide/dist/esm/icons/wand-sparkles.js:
lucide/dist/esm/icons/wallpaper.js:
lucide/dist/esm/icons/wand.js:
lucide/dist/esm/icons/warehouse.js:
lucide/dist/esm/icons/washing-machine.js:
lucide/dist/esm/icons/watch.js:
lucide/dist/esm/icons/waves-ladder.js:
lucide/dist/esm/icons/waypoints.js:
lucide/dist/esm/icons/waves.js:
lucide/dist/esm/icons/webcam.js:
lucide/dist/esm/icons/webhook-off.js:
lucide/dist/esm/icons/webhook.js:
lucide/dist/esm/icons/weight.js:
lucide/dist/esm/icons/wheat-off.js:
lucide/dist/esm/icons/wheat.js:
lucide/dist/esm/icons/whole-word.js:
lucide/dist/esm/icons/wifi-cog.js:
lucide/dist/esm/icons/wifi-high.js:
lucide/dist/esm/icons/wifi-low.js:
lucide/dist/esm/icons/wifi-off.js:
lucide/dist/esm/icons/wifi-pen.js:
lucide/dist/esm/icons/wifi-zero.js:
lucide/dist/esm/icons/wifi-sync.js:
lucide/dist/esm/icons/wifi.js:
lucide/dist/esm/icons/wind-arrow-down.js:
lucide/dist/esm/icons/wind.js:
lucide/dist/esm/icons/wine-off.js:
lucide/dist/esm/icons/wine.js:
lucide/dist/esm/icons/workflow.js:
lucide/dist/esm/icons/wrench.js:
lucide/dist/esm/icons/x.js:
lucide/dist/esm/icons/worm.js:
lucide/dist/esm/icons/youtube.js:
lucide/dist/esm/icons/zap-off.js:
lucide/dist/esm/icons/zap.js:
lucide/dist/esm/icons/zoom-in.js:
lucide/dist/esm/icons/zoom-out.js:
lucide/dist/esm/iconsAndAliases.js:
lucide/dist/esm/lucide.js:
  (**
   * @license lucide v0.548.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=app.js.map
