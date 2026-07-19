// IT Asset Management - API Client
// Menggantikan google.script.run untuk komunikasi dengan GAS Backend

const GAS_WEB_APP_URL = "YOUR_GAS_WEB_APP_URL_HERE"; // Ganti dengan URL hasil deploy "Anyone"

const API = {
    /**
     * Helper GET requests
     */
    gasGet: async function (action, params = {}) {
        try {
            if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                throw new Error("GAS Web App URL belum disetting di js/api.js");
            }
            
            const url = new URL(GAS_WEB_APP_URL);
            url.searchParams.append('action', action);
            for (const key in params) {
                url.searchParams.append(key, params[key]);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) throw new Error("HTTP Status " + response.status);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("GET API Error (" + action + "):", error);
            throw error;
        }
    },

    /**
     * Helper POST requests
     */
    gasPost: async function (action, payload) {
        try {
            if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
                throw new Error("GAS Web App URL belum disetting di js/api.js");
            }

            // Google Apps Script doPost requires Content-Type: text/plain or x-www-form-urlencoded to avoid preflight CORS issues
            // We'll send it as JSON string but with text/plain type
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: action,
                    data: payload
                }),
                redirect: 'follow'
            });

            if (!response.ok) throw new Error("HTTP Status " + response.status);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("POST API Error (" + action + "):", error);
            throw error;
        }
    },

    // ==========================================
    // WRAPPER FUNCTIONS (Menggantikan google.script.run)
    // ==========================================

    getDashboardInitData: function() { return this.gasGet('getDashboardInitData'); },
    getDropdownData: function() { return this.gasGet('getDropdownData'); },
    getActivityLogs: function() { return this.gasGet('getActivityLogs'); },
    getMaintenanceData: function() { return this.gasGet('getMaintenanceData'); },
    getAccessoriesData: function() { return this.gasGet('getAccessoriesData'); },
    getLoansData: function() { return this.gasGet('getLoansData'); },

    saveActivityLog: function(formData) { return this.gasPost('saveActivityLog', formData); },
    markMaintenanceDone: function(sn, month, date) { return this.gasPost('markMaintenanceDone', { sn, month, date }); },
    saveManualMaintenanceSchedule: function(sn, targetDate, targetReschedule, period) { 
        return this.gasPost('saveManualMaintenanceSchedule', { sn, targetDate, targetReschedule, period }); 
    },
    addAccessory: function(formData) { return this.gasPost('addAccessory', formData); },
    addAssetLoan: function(formData) { return this.gasPost('addAssetLoan', formData); },
    returnAssetLoan: function(loanNo) { return this.gasPost('returnAssetLoan', { loanNo }); }
};

// Polyfill Promise handlers to mimic withSuccessHandler chaining
Function.prototype.withSuccessHandler = function(callback) {
    const fn = this;
    const wrapper = function(...args) {
        const promise = fn.apply(API, args);
        wrapper.currentPromise = promise.then(callback);
        return wrapper;
    };
    wrapper.withFailureHandler = function(errCallback) {
        if (wrapper.currentPromise) {
            wrapper.currentPromise.catch(errCallback);
        }
        return wrapper;
    };
    return wrapper;
};

Function.prototype.withFailureHandler = function(callback) {
    const fn = this;
    const wrapper = function(...args) {
        const promise = fn.apply(API, args);
        wrapper.currentPromise = promise.catch(callback);
        return wrapper;
    };
    wrapper.withSuccessHandler = function(sucCallback) {
        if (wrapper.currentPromise) {
            wrapper.currentPromise.then(sucCallback); // Not standard Promise chaining but good enough for simulating GAS
        }
        return wrapper;
    };
    return wrapper;
};

// Mocking google.script.run so we don't have to rewrite EVERY SINGLE CALL in app.js yet
// We will also do the refactor in app.js to use promises directly if possible, or use this mock
window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = {
    withSuccessHandler: function(callback) {
        return {
            withFailureHandler: function(errCallback) {
                return this._createCallWrapper(callback, errCallback);
            },
            ...this._createCallWrapper(callback, null)
        };
    },
    withFailureHandler: function(errCallback) {
        return {
            withSuccessHandler: function(callback) {
                return this._createCallWrapper(callback, errCallback);
            },
            ...this._createCallWrapper(null, errCallback)
        };
    },
    _createCallWrapper: function(onSuccess, onError) {
        const wrapper = {};
        // Map all API methods
        Object.keys(API).forEach(key => {
            if (typeof API[key] === 'function' && key !== 'gasGet' && key !== 'gasPost') {
                wrapper[key] = function(...args) {
                    API[key](...args)
                        .then(res => { if (onSuccess) onSuccess(res); })
                        .catch(err => { if (onError) onError(err); });
                };
            }
        });
        return wrapper;
    },
    
    // Fallback if called directly without handlers (not recommended but possible)
    ...Object.keys(API).reduce((acc, key) => {
        if (typeof API[key] === 'function' && key !== 'gasGet' && key !== 'gasPost') {
            acc[key] = function(...args) {
                API[key](...args);
            };
        }
        return acc;
    }, {})
};
