require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.15.6/min/vs' } });

// Before loading vs/editor/editor.main, define a global MonacoEnvironment that overwrites
// the default worker url location (used when creating WebWorkers). The problem here is that
// HTML5 does not allow cross-domain web workers, so we need to proxy the instantiation of
// a web worker through a same-domain script
window.MonacoEnvironment = {
    getWorkerUrl: function (workerId, label) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
            baseUrl: 'https://unpkg.com/monaco-editor@0.15.6/min/'
            };
            importScripts('https://unpkg.com/monaco-editor@0.15.6/min/vs/base/worker/workerMain.js');`
        )}`;
    }
};

var DEFAULT_LANG = "rust";
var DEFAULT_CONTENT = "no file content provided;"

window.$docsify.plugins.push(
    function (hook, vm) {
		console.log("Docsify Window")

        hook.afterEach(function (html) {
            var parser = new DOMParser();
            var htmlDoc = parser.parseFromString(html, 'text/html');
			let allFiles = htmlDoc.querySelectorAll("code[class*=lang-]");

			// --- Defaults
			// names of the files.
			let names = [];
			// codes in each file, same order.
			let code_nodes = [];
			let lang = DEFAULT_LANG;

			// scrape file names.
			for (let n of allFiles.values()) {
				code_nodes.push(n.innerText)
				names.push(
					n.className.split("-")[1]
					+ "."
					+ n.className.split("-")[2]
				);
				if (n.className.split("-")[2]) {
					lang = n.className.split("-")[2]
				}
			}

			// global env.
			var env = {
				codes: code_nodes,
				lang: lang,
			}

			// add file selector
			let selector = document.createElement("select")
			selector.id = "file-selector"
			let idx = 0
			names.forEach((name, idx) => {
				let opt = document.createElement("option")
				opt.value = idx
				opt.innerHTML = name
				selector.appendChild(opt)
				idx += 1
			})
			selector.onchange = function(e) {
				let idx = Number(this.value)
				loadEditor(env.codes[idx], false, false)
			}

			// add diff selector
			let diff = document.createElement("select")
			diff.id = "diff-selector"
			names.forEach((name, idx) => {
				let opt = document.createElement("option")
				opt.value = idx
				opt.innerHTML = name
				diff.appendChild(opt)
				idx += 1
			})
			diff.onchange = function() {
				let s_idx = selector.value
				let d_idx = this.value
				loadDiffEditor(
					env.codes[s_idx],
					env.codes[d_idx],
				)
			}

			env.selector = selector;
			env.diff = diff
			window.cv_env = env;

			console.log(env);
            if (allFiles.length) {
                var two_col = [
                    '<div class="row">',
						'<div class="lesson column">', html, '</div>',
						'<div class="code column">',
							'<div id="editor" class="editor"></div>',
							'<div id="editor_bar" class="editor-bar"></div>',
						'</div>',
                    '</div>'
                ].join('');

                return two_col;
            } else {
                var one_col = [
                    '<div class="fullpage">',
                    html,
                    '</div>'
                ].join('')

                return one_col;
			}
        });

        hook.doneEach(function () {
			hintRevealed = false;
            if (document.getElementById("editor")) {
				var editor_bar = document.getElementById("editor_bar");
				editor_bar.appendChild(window.cv_env.selector)
				editor_bar.appendChild(window.cv_env.diff)

			// 	if (window.cv_env.code_previous && window.cv_env.code_template) {
			// 		var previous_button = document.createElement("button");
            //         previous_button.innerHTML = "&#8656; &#x1D321;";
            //         previous_button.classList += "editor-button";
			// 		previous_button.onclick = function () { loadDiffEditor(window.cv_env.code_template, window.cv_env.code_previous); };
            //         editor_bar.appendChild(previous_button);
            //     }

			// 	if (window.cv_env.code_template) {
			// 		var template_button = document.createElement("button");
            //         template_button.innerHTML = "&#x1F6E0; Starting Point";
			// 		template_button.classList += "editor-button";
			// 		template_button.onclick = function () { loadEditor(false, true) };
            //         editor_bar.appendChild(template_button);
			// 		loadEditor(false, true);
            //     }

			// 	if (window.cv_env.code_final) {
            //         var final_button = document.createElement("button");
            //         final_button.innerHTML = "&#x2705; Potential Solution";
            //         final_button.classList += "editor-button";
			// 		final_button.onclick = function () { loadEditor(true, false); };
            //         editor_bar.appendChild(final_button);

			// 		if (!window.cv_env.code_template) {
            //             loadEditor(true, false);
            //         }
            //     }

			// 	if (window.cv_env.code_template && window.cv_env.code_final) {
            //         var diff_button = document.createElement("button");
            //         diff_button.innerHTML = "&#x1D321; Diff View";
            //         diff_button.classList += "editor-button";
			// 		diff_button.onclick = function () { loadDiffEditor(window.cv_env.code_template, window.cv_env.code_final); };
            //         editor_bar.appendChild(diff_button);
            //     }
            }
        })
	}
);

function loadEditor(editor_text, read_only, template_update) {
	read_only = read_only || false;
	template_update = template_update || false;

    require(['vs/editor/editor.main'], function () {
        if (window.monaco_editor) {
            window.view_state = window.monaco_editor.saveViewState();
            window.monaco_editor.dispose();
        }

        window.monaco_editor = monaco.editor.create(document.getElementById('editor'), {
			language: window.cv_env.lang,
            theme: "vs-dark",
            readOnly: read_only,
            automaticLayout: true,
            minimap: {
                enabled: false
            }
        });

        window.monaco_editor.setValue(editor_text)
        if (template_update) {
            window.monaco_editor.onDidChangeModelContent(function () {
                window.cv_env.code_template = window.monaco_editor.getValue();
            });
        }

        window.monaco_editor.restoreViewState(currentView());

        removeElement(document.getElementsByClassName("docsify-tabs")[0]);
    });
}

function loadDiffEditor(original_text, modified_text) {
    require(['vs/editor/editor.main'], function () {
        if (window.monaco_editor) {
            window.view_state = window.monaco_editor.saveViewState();
            window.monaco_editor.dispose();
        }

        window.monaco_editor = monaco.editor.createDiffEditor(document.getElementById('editor'), {
			language: window.cv_env.lang,
            theme: "vs-dark",
            enableSplitViewResizing: false,
            renderSideBySide: false,
            readOnly: true,
            automaticLayout: true
        });

        var originalModel = monaco.editor.createModel(original_text, window.cv_env.lang);
        var modifiedModel = monaco.editor.createModel(modified_text, window.cv_env.lang);

        window.monaco_editor.setModel({
            original: originalModel,
            modified: modifiedModel
        });

        window.monaco_editor.restoreViewState({ original: currentView() });

        removeElement(document.getElementsByClassName("docsify-tabs")[0]);
    });
}

function removeElement(element) {
    if (element) {
        element.parentNode.removeChild(element);
    }
}

function currentView() {
    if (window.view_state) {
        if (window.view_state.modified) {
            return window.view_state.modified;
        }

        return window.view_state;
    }
}