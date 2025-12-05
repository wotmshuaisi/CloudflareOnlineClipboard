interface Env {
	CLIPS: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/') {
			try {
				const body = (await request.json()) as { content?: string; readOnce?: boolean; ttl?: number; lang?: string };
				const content = body.content ?? '';
				const readOnce = !!body.readOnce;
				const ttl = Number(body.ttl) || 600;
				const lang = body.lang === 'zh' ? 'zh' : 'en';

				const id = crypto.randomUUID();

				const createdAt = Date.now();
				const toStore = JSON.stringify({ content, readOnce, lang, createdAt, ttl });

				await env.CLIPS.put(id, toStore, { expirationTtl: ttl });

				return new Response(JSON.stringify({ id }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err) {
				return new Response('Bad Request', { status: 400 });
			}
		}

		if (request.method === 'GET' && url.pathname === '/') {
			return new Response(getHTMLPage(), {
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
			});
		}

		if (request.method === 'GET') {
			const id = url.pathname.replace(/^\/+/, '');
			if (!id) return new Response('Missing ID', { status: 400 });

			const data = await env.CLIPS.get(id);
			if (!data) return new Response('Not Found', { status: 404 });

			const parsed = JSON.parse(data);

			if (parsed.readOnce) {
				await env.CLIPS.delete(id);
			}

			const lang = parsed.lang === 'zh' ? 'zh' : 'en';

			const createdAt = parsed.createdAt ? Number(parsed.createdAt) : Date.now();
			const ttl = parsed.ttl ? Number(parsed.ttl) : 600;
			const readOnce = !!parsed.readOnce;

			return new Response(getViewPage(parsed.content, id, lang, createdAt, ttl, readOnce), {
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
			});
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		return new Response('Method Not Allowed', { status: 405 });
	},
};

function getHTMLPage() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Online Clipboard</title>
	<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			padding: 20px;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			padding: 40px;
			max-width: 800px;
			width: 100%;
		}
		h1 {
			color: #333;
			margin-bottom: 30px;
			text-align: center;
		}
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			margin-bottom: 8px;
			color: #555;
			font-weight: 500;
		}
		select {
			width: 100%;
			padding: 8px 12px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			font-size: 14px;
			background: white;
			cursor: pointer;
		}
		select:focus {
			outline: none;
			border-color: #667eea;
		}
		textarea {
			width: 100%;
			min-height: 200px;
			padding: 12px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			font-family: 'Monaco', 'Courier New', monospace;
			font-size: 14px;
			resize: vertical;
			transition: border-color 0.3s;
		}
		textarea:focus {
			outline: none;
			border-color: #667eea;
		}
		.checkbox-group {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		input[type="checkbox"] {
			width: 18px;
			height: 18px;
			cursor: pointer;
		}
		input[type="number"] {
			width: 100px;
			padding: 8px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			font-size: 14px;
		}
		input[type="number"]:focus {
			outline: none;
			border-color: #667eea;
		}
		.help-text {
			display: block;
			margin-top: 6px;
			color: #888;
			font-size: 12px;
			line-height: 1.4;
		}
		button {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			padding: 12px 32px;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
			width: 100%;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		button:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
		}
		button:active {
			transform: translateY(0);
		}
		.copy-button {
			width: auto;
			margin-top: 12px;
			padding: 10px 24px;
		}
		.copy-button.copied {
			background: #4caf50;
		}
		.result {
			margin-top: 20px;
			padding: 16px;
			background: #f5f5f5;
			border-radius: 8px;
			display: none;
		}
		.result.show {
			display: block;
		}
		.preview {
			margin-top: 20px;
			padding: 16px;
			background: #f9f9f9;
			border-radius: 8px;
			border: 2px solid #e0e0e0;
			min-height: 100px;
		}
		.preview h3 {
			margin-bottom: 12px;
			color: #333;
		}
		.preview-content {
			color: #555;
			word-wrap: break-word;
			overflow-wrap: break-word;
			max-width: 100%;
		}
		.preview-content * {
			max-width: 100%;
		}
		.preview-content h1, .preview-content h2, .preview-content h3 {
			margin-top: 16px;
			margin-bottom: 8px;
		}
		.preview-content code {
			background: #f0f0f0;
			padding: 2px 6px;
			border-radius: 4px;
			font-family: 'Monaco', 'Courier New', monospace;
			word-wrap: break-word;
			overflow-wrap: break-word;
		}
		.preview-content pre {
			background: #f0f0f0;
			padding: 12px;
			border-radius: 4px;
			overflow-x: auto;
			white-space: pre-wrap;
			word-wrap: break-word;
			position: relative;
		}
		.preview-content pre code {
			background: none;
			padding: 0;
		}
		.preview-content pre:hover .code-copy-button {
			opacity: 1;
			visibility: visible;
		}
		.code-copy-button {
			position: absolute;
			top: 8px;
			right: 8px;
			background: #667eea;
			color: white;
			border: none;
			padding: 6px 12px;
			border-radius: 4px;
			font-size: 12px;
			cursor: pointer;
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.2s, visibility 0.2s;
		}
		.code-copy-button:hover {
			opacity: 1;
		}
		.code-copy-button.copied {
			background: #4caf50;
			opacity: 1;
			visibility: visible;
		}
		.preview-content blockquote {
			border-left: 4px solid #667eea;
			padding-left: 16px;
			margin-left: 0;
			color: #666;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📋 Online Clipboard</h1>
		<form id="clipboardForm">
			<div class="form-group">
				<label for="lang" data-en="Language:" data-zh="语言:">Language:</label>
				<select id="lang" name="lang">
					<option value="en">English</option>
					<option value="zh">中文</option>
				</select>
			</div>
			<div class="form-group">
				<label for="content" data-en="Content (Markdown supported):" data-zh="内容（支持 Markdown）:">Content (Markdown supported):</label>
				<textarea id="content" name="content" data-placeholder-en="Enter your clipboard content here... Markdown syntax is supported!" data-placeholder-zh="在此输入剪贴板内容... 支持 Markdown 语法！"></textarea>
			</div>
			<div class="form-group">
				<div class="checkbox-group">
					<input type="checkbox" id="readOnce" name="readOnce" checked>
					<label for="readOnce" data-en="Read once (delete after viewing)" data-zh="仅读一次（查看后删除）">Read once (delete after viewing)</label>
				</div>
			</div>
			<div class="form-group">
				<label for="ttl" data-en="TTL (seconds, default: 600):" data-zh="TTL（秒，默认：600）:">TTL (seconds, default: 600):</label>
				<input type="number" id="ttl" name="ttl" value="600" min="60">
				<small class="help-text" data-en="Time To Live: The clipboard will be automatically deleted after this many seconds (minimum 60 seconds)." data-zh="生存时间：剪贴板将在此秒数后自动删除（最少 60 秒）。">Time To Live: The clipboard will be automatically deleted after this many seconds (minimum 60 seconds).</small>
			</div>
			<button type="submit" data-en="Create Clipboard" data-zh="创建剪贴板">Create Clipboard</button>
		</form>
		<div class="preview">
			<h3 data-en="Markdown Preview:" data-zh="Markdown 预览:">Markdown Preview:</h3>
			<div class="preview-content" id="preview"></div>
		</div>
		<div class="result" id="result">
			<p><strong data-en="Clipboard created!" data-zh="剪贴板已创建！">Clipboard created!</strong></p>
			<button type="button" class="copy-button" id="copyButton" data-en="Click here to copy the link" data-zh="点击此处复制链接">Click here to copy the link</button>
		</div>
	</div>
	<script>
		const form = document.getElementById('clipboardForm');
		const contentTextarea = document.getElementById('content');
		const preview = document.getElementById('preview');
		const result = document.getElementById('result');
		const copyButton = document.getElementById('copyButton');
		const langSelect = document.getElementById('lang');
		let currentLang = 'en';
		let clipboardUrl = '';


		function updateLanguage() {
			currentLang = langSelect.value;
			document.querySelectorAll('[data-en]').forEach(el => {
				const text = el.getAttribute('data-' + currentLang) || el.getAttribute('data-en');
				if (el.tagName === 'LABEL' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'STRONG') {
					el.textContent = text;
				} else if (el.tagName === 'BUTTON' && !el.classList.contains('code-copy-button')) {
					el.textContent = text;
				} else if (el.tagName === 'TEXTAREA') {
					el.placeholder = text;
				} else if (el.tagName === 'SMALL') {
					el.textContent = text;
				}
			});

			preview.querySelectorAll('.code-copy-button').forEach(btn => {
				if (!btn.classList.contains('copied')) {
					btn.textContent = currentLang === 'zh' ? '复制' : 'Copy';
				}
			});
		}

		langSelect.addEventListener('change', updateLanguage);


		function addCopyButtonsToCodeBlocks(container) {
			const codeBlocks = container.querySelectorAll('pre code');
			codeBlocks.forEach(codeEl => {
				const preEl = codeEl.parentElement;

				if (preEl.querySelector('.code-copy-button')) return;
				
				const copyButton = document.createElement('button');
				copyButton.className = 'code-copy-button';
				copyButton.textContent = currentLang === 'zh' ? '复制' : 'Copy';
				copyButton.setAttribute('aria-label', currentLang === 'zh' ? '复制代码' : 'Copy code');
				
				copyButton.addEventListener('click', async () => {
					try {
						const codeText = codeEl.textContent || codeEl.innerText;
						await navigator.clipboard.writeText(codeText);
						const originalText = copyButton.textContent;
						copyButton.textContent = currentLang === 'zh' ? '已复制！' : 'Copied!';
						copyButton.classList.add('copied');
						setTimeout(() => {
							copyButton.textContent = originalText;
							copyButton.classList.remove('copied');
						}, 2000);
					} catch (err) {
						alert(currentLang === 'zh' ? '复制失败' : 'Failed to copy');
					}
				});
				
				preEl.style.position = 'relative';
				preEl.appendChild(copyButton);
			});
		}


		function updatePreview() {
			const content = contentTextarea.value;
			if (content.trim()) {
				preview.innerHTML = marked.parse(content);
				addCopyButtonsToCodeBlocks(preview);
			} else {
				preview.innerHTML = '<em>' + (currentLang === 'zh' ? '预览将在此显示...' : 'Preview will appear here...') + '</em>';
			}
		}

		contentTextarea.addEventListener('input', updatePreview);


		copyButton.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(clipboardUrl);
				const originalText = copyButton.textContent;
				copyButton.textContent = currentLang === 'zh' ? '已复制！' : 'Copied!';
				copyButton.classList.add('copied');
				setTimeout(() => {
					copyButton.textContent = originalText;
					copyButton.classList.remove('copied');
				}, 2000);
			} catch (err) {
				alert(currentLang === 'zh' ? '复制失败' : 'Failed to copy');
			}
		});


		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			
			const formData = {
				content: contentTextarea.value,
				readOnce: document.getElementById('readOnce').checked,
				ttl: parseInt(document.getElementById('ttl').value) || 600,
				lang: langSelect.value
			};

			try {
				const response = await fetch('/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(formData)
				});

				if (response.ok) {
					const data = await response.json();
					clipboardUrl = window.location.origin + '/' + data.id;
					result.classList.add('show');
					

					result.scrollIntoView({ behavior: 'smooth' });
				} else {
					alert(currentLang === 'zh' ? '创建剪贴板失败' : 'Failed to create clipboard');
				}
			} catch (error) {
				alert((currentLang === 'zh' ? '错误：' : 'Error: ') + error.message);
			}
		});


		updatePreview();
	</script>
</body>
</html>`;
}

function getViewPage(content: string, id: string, lang: string, createdAt: number, ttl: number, readOnce: boolean) {
	const isZh = lang === 'zh';
	const title = isZh ? '剪贴板内容' : 'Online Clipboard Content';
	const backLink = isZh ? '← 创建新剪贴板' : '← Create new clipboard';
	const createdLabel = isZh ? '创建时间：' : 'Created at: ';
	const readOnceLabel = isZh ? '仅读一次：' : 'Read once: ';
	const expiresLabel = isZh ? '剩余时间：' : 'Time remaining: ';
	const expiredLabel = isZh ? '已过期' : 'Expired';
	const yesLabel = isZh ? '是' : 'Yes';
	const noLabel = isZh ? '否' : 'No';

	return `<!DOCTYPE html>
<html lang="${lang}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title}</title>
	<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			padding: 20px;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.container {
			background: white;
			border-radius: 16px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			padding: 40px;
			max-width: 900px;
			width: 100%;
		}
		h1 {
			color: #333;
			margin-bottom: 30px;
			text-align: center;
		}
		.metadata {
			margin-bottom: 24px;
			padding: 16px;
			background: #f5f5f5;
			border-radius: 8px;
			font-size: 14px;
			color: #666;
		}
		.metadata-item {
			margin-bottom: 8px;
		}
		.metadata-item:last-child {
			margin-bottom: 0;
		}
		.countdown {
			font-weight: 600;
			color: #667eea;
		}
		.countdown.expired {
			color: #f44336;
		}
		.readOnce {
			font-weight: 600;
		}
		.readOnce.yes {
			color: #f44336;
		}
		.readOnce.no {
			color: #4caf50;
		}
		.content-wrapper {
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			padding: 16px;
			background: #fafafa;
			margin-bottom: 20px;
			overflow-x: auto;
		}
		.content {
			color: #555;
			word-wrap: break-word;
			overflow-wrap: break-word;
			max-width: 100%;
		}
		.content * {
			max-width: 100%;
		}
		.content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
			margin-top: 12px;
			margin-bottom: 6px;
			color: #333;
		}
		.content h1:first-child, .content h2:first-child, .content h3:first-child, 
		.content h4:first-child, .content h5:first-child, .content h6:first-child {
			margin-top: 0;
		}
		.content p {
			margin-bottom: 8px;
		}
		.content p:last-child {
			margin-bottom: 0;
		}
		.content code {
			background: #f0f0f0;
			padding: 2px 6px;
			border-radius: 4px;
			font-family: 'Monaco', 'Courier New', monospace;
			font-size: 0.9em;
			word-wrap: break-word;
			overflow-wrap: break-word;
		}
		.content pre {
			background: #f0f0f0;
			padding: 12px;
			border-radius: 8px;
			overflow-x: auto;
			margin-bottom: 8px;
			white-space: pre-wrap;
			word-wrap: break-word;
			position: relative;
		}
		.content pre code {
			background: none;
			padding: 0;
		}
		.content pre:hover .code-copy-button {
			opacity: 1;
			visibility: visible;
		}
		.content .code-copy-button {
			position: absolute;
			top: 8px;
			right: 8px;
			background: #667eea;
			color: white;
			border: none;
			padding: 6px 12px;
			border-radius: 4px;
			font-size: 12px;
			cursor: pointer;
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.2s, visibility 0.2s;
		}
		.content .code-copy-button:hover {
			opacity: 1;
		}
		.content .code-copy-button.copied {
			background: #4caf50;
			opacity: 1;
			visibility: visible;
		}
		.content blockquote {
			border-left: 4px solid #667eea;
			padding-left: 12px;
			margin-left: 0;
			margin-bottom: 8px;
			color: #666;
			font-style: italic;
		}
		.content ul, .content ol {
			margin-left: 20px;
		}
		.content li {
			margin-bottom: 2px;
		}
		.content ul ul, .content ol ol, .content ul ol, .content ol ul {
			margin-top: 2px;
			margin-bottom: 2px;
		}
		.content a {
			color: #667eea;
			text-decoration: none;
		}
		.content a:hover {
			text-decoration: underline;
		}
		.content table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 8px;
		}
		.content table th, .content table td {
			border: 1px solid #e0e0e0;
			padding: 6px 10px;
			text-align: left;
		}
		.content table th {
			background: #f5f5f5;
			font-weight: 600;
		}
		.back-link {
			display: inline-block;
			margin-top: 20px;
			color: #667eea;
			text-decoration: none;
			font-weight: 500;
		}
		.back-link:hover {
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📋 ${title}</h1>
		<div class="metadata" id="metadata">
			<div class="metadata-item">
				${createdLabel}<span id="createdTime"></span>
			</div>
			<div class="metadata-item">
				${readOnceLabel}<span class="readOnce" id="readOnce"></span>
			</div>
			<div class="metadata-item">
				${expiresLabel}<span class="countdown" id="countdown"></span>
			</div>
		</div>
		<div class="content-wrapper">
			<div class="content" id="content"></div>
		</div>
		<a href="/" class="back-link">${backLink}</a>
	</div>
	<script>
		const content = ${JSON.stringify(content)};
		const contentDiv = document.getElementById('content');
		const isZh = ${lang === 'zh'};
		contentDiv.innerHTML = marked.parse(content);
		

		const codeBlocks = contentDiv.querySelectorAll('pre code');
		codeBlocks.forEach(codeEl => {
			const preEl = codeEl.parentElement;
			const copyButton = document.createElement('button');
			copyButton.className = 'code-copy-button';
			copyButton.textContent = isZh ? '复制' : 'Copy';
			copyButton.setAttribute('aria-label', isZh ? '复制代码' : 'Copy code');
			
			copyButton.addEventListener('click', async () => {
				try {
					const codeText = codeEl.textContent || codeEl.innerText;
					await navigator.clipboard.writeText(codeText);
					const originalText = copyButton.textContent;
					copyButton.textContent = isZh ? '已复制！' : 'Copied!';
					copyButton.classList.add('copied');
					setTimeout(() => {
						copyButton.textContent = originalText;
						copyButton.classList.remove('copied');
					}, 2000);
				} catch (err) {
					alert(isZh ? '复制失败' : 'Failed to copy');
				}
			});
			
			preEl.style.position = 'relative';
			preEl.appendChild(copyButton);
		});
		

		const createdAt = ${Number(createdAt)};
		const ttl = ${Number(ttl) || 600};
		const readOnce = ${readOnce};
		const createdTimeEl = document.getElementById('createdTime');
		const readOnceEl = document.getElementById('readOnce');
		const countdownEl = document.getElementById('countdown');
		

		readOnceEl.textContent = readOnce ? '${yesLabel}' : '${noLabel}';
		readOnceEl.classList.add(readOnce ? 'yes' : 'no');
		

		if (createdAt && createdAt > 0) {
			const createdDate = new Date(createdAt);
			if (!isNaN(createdDate.getTime())) {
				createdTimeEl.textContent = createdDate.toISOString().replace('T', ' ').slice(0,19);
			} else {
				createdTimeEl.textContent = '${isZh ? '未知' : 'Unknown'}';
			}
		} else {
			createdTimeEl.textContent = '${isZh ? '未知' : 'Unknown'}';
		}
		

		function updateCountdown() {
			const now = Date.now();
			const elapsed = Math.floor((now - createdAt) / 1000);
			const remaining = ttl - elapsed;
			
			if (remaining <= 0) {
				countdownEl.textContent = '${expiredLabel}';
				countdownEl.classList.add('expired');
				return;
			}
			
			const hours = Math.floor(remaining / 3600);
			const minutes = Math.floor((remaining % 3600) / 60);
			const seconds = remaining % 60;
			
			let timeStr = '';
			if (hours > 0) {
				timeStr = hours + '${isZh ? '小时 ' : 'h '}' + minutes + '${isZh ? '分钟 ' : 'm '}' + seconds + '${isZh ? '秒' : 's'}';
			} else if (minutes > 0) {
				timeStr = minutes + '${isZh ? '分钟 ' : 'm '}' + seconds + '${isZh ? '秒' : 's'}';
			} else {
				timeStr = seconds + '${isZh ? '秒' : 's'}';
			}
			
			countdownEl.textContent = timeStr;
			countdownEl.classList.remove('expired');
		}
		

		updateCountdown();
		setInterval(updateCountdown, 1000);
	</script>
</body>
</html>`;
}
