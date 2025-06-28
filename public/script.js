// public/script.js (Definitive, Corrected Version)

document.addEventListener('DOMContentLoaded', () => {
    // --- Page & Element Selection ---
    const pages = {
        home: document.getElementById('home-page'),
        upload: document.getElementById('upload-page'),
        results: document.getElementById('results-page'),
        looksmatch: document.getElementById('looksmatch-page')
    };
    const loadingOverlay = document.getElementById('loading-overlay');
    const goToUploadBtn = document.getElementById('go-to-upload');
    const backToHomeBtn = document.getElementById('back-to-home');
    const goToResultsBtn = document.getElementById('go-to-results');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadPrompt = document.getElementById('upload-prompt');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const analyzeButtonContainer = document.getElementById('analyze-button-container');
    let uploadedFile = null;
    let uploadedFileUrl = null;
    const resultsPage = document.getElementById('results-page');
    const resultsNav = document.getElementById('results-nav');
    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    const dotsContainer = document.getElementById('progress-dots');

    function showPage(pageName) {
        Object.values(pages).forEach(p => { if (p) p.classList.remove('active'); });
        if (pages[pageName]) pages[pageName].classList.add('active');
    }

    function getDistributionInfo(score) {
        if (score >= 9.5) return { tier: "Generational Rarity", percentile: "0.01%", position: 97.5 };
        if (score >= 9.0) return { tier: "Supermodel Tier", percentile: "1%", position: 92.5 };
        if (score >= 8.5) return { tier: "Highly Attractive", percentile: "2.5%", position: 87.5 };
        if (score >= 7.0) return { tier: "Attractive", percentile: "10%", position: 77 };
        if (score >= 6.0) return { tier: "Above Average", percentile: "25%", position: 65 };
        if (score >= 4.0) {
            const position = 40 + ((score - 4) / 2) * 20;
            return { tier: "Average", percentile: "50%+", position: position };
        }
        return { tier: "Below Average", percentile: "Bottom 50%", position: 20 };
    }

    if (goToUploadBtn) goToUploadBtn.addEventListener('click', () => showPage('upload'));
    if (backToHomeBtn) backToHomeBtn.addEventListener('click', () => showPage('home'));
    if (resultsPage) {
        resultsPage.addEventListener('click', (e) => {
            if (e.target.closest('#back-to-upload')) showPage('upload');
        });
    }

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragging');
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', e => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
    }

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            uploadedFile = file;
            const reader = new FileReader();
            reader.onload = e => {
                uploadedFileUrl = e.target.result;
                imagePreview.src = uploadedFileUrl;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (previewContainer) previewContainer.classList.remove('hidden');
                if (analyzeButtonContainer) analyzeButtonContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    if (goToResultsBtn) {
        goToResultsBtn.addEventListener('click', async () => {
            if (!uploadedFile) return;
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
            const formData = new FormData();
            formData.append('image', uploadedFile);
            try {
                const response = await fetch('/api/analyze', { method: 'POST', body: formData });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server error: ${response.statusText}`);
                }
                const data = await response.json();
                populateResults(data);
                showPage('results');
            } catch (error) {
                console.error('Analysis failed:', error);
                alert(`Analysis Failed: ${error.message}`);
            } finally {
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }
        });
    }

    function populateResults(data) {
        if (!resultsPage || !data) return;
        const oldScrollContainer = document.getElementById('results-scroll-container');
        if (oldScrollContainer) oldScrollContainer.remove();
        const scrollContainer = document.createElement('div');
        scrollContainer.id = 'results-scroll-container';

        if (typeof data.overallScore === 'number') {
            const distInfo = getDistributionInfo(data.overallScore);
            const overallSlide = document.createElement('div');
            overallSlide.className = 'result-slide';
            overallSlide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="Your Photo" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Overall Analysis</h3><div class="flex items-center justify-center mb-4"><span class="rating-score">${data.overallScore.toFixed(1)}</span><span class="rating-total">/ 10</span></div><div class="distribution-chart-container"><div class="chart-statement"><h4>Where You Stand</h4><p>Your score places you in the <strong>top ${distInfo.percentile}</strong> of the population, within the <strong>${distInfo.tier}</strong>.</p></div><div class="distribution-chart"><svg class="chart-curve" viewBox="0 0 200 100" preserveAspectRatio="none"><path d="M0,100 C80,-40 120,40 200,100 Z"></path></svg><div class="chart-marker" style="left: ${distInfo.position}%;"></div></div><div class="chart-labels"><span>Below Avg.</span><span>Average</span><span>Attractive</span><span>Elite</span></div></div><p class="overall-summary">${data.overallSummary || 'A summary of your overall facial aesthetics.'}</p></div>`;
            scrollContainer.appendChild(overallSlide);
        }

        if (data.analysis && Array.isArray(data.analysis)) {
            data.analysis.forEach(item => {
                const slide = document.createElement('div');
                slide.className = 'result-slide';

                // =================================================================
                // === THIS IS THE CRITICAL FIX I MISSED. IT IS NOW CORRECT. ===
                // This attaches the zoom data to the slide element itself.
                if (item.boundingBox) {
                    slide.dataset.bbox = JSON.stringify(item.boundingBox);
                }
                if (item.featureName) {
                    slide.dataset.featureName = item.featureName;
                }
                // =================================================================

                let ratingsGridHTML = '<div class="ratings-grid">';
                if (typeof item.aestheticRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Aesthetic</div><div class="rating-value-small">${item.aestheticRating.toFixed(1)}</div></div>`;
                if (typeof item.harmonyRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Harmony</div><div class="rating-value-small">${item.harmonyRating.toFixed(1)}</div></div>`;
                if (typeof item.healthRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Health</div><div class="rating-value-small">${item.healthRating.toFixed(1)}</div></div>`;
                ratingsGridHTML += '</div>';
                let lookalikeHTML = '';
                if (item.celebrityLookalike) lookalikeHTML = `<div class="lookalike-section"><div class="lookalike-icon"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg></div><p class="lookalike-text">Feature reminiscent of <strong>${item.celebrityLookalike}</strong></p></div>`;
                slide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="${item.featureName || 'Feature Analysis'}" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">${item.featureName || 'Feature Analysis'}</h3>${ratingsGridHTML}<p class="feature-description">${item.reasoning || 'Detailed analysis of this feature.'}</p>${lookalikeHTML}</div>`;
                scrollContainer.appendChild(slide);
            });
        }
        if (data.recommendedProducts && data.recommendedProducts.length > 0) {
            const planSlide = document.createElement('div');
            planSlide.className = 'result-slide';
            let productsHTML = '';
            data.recommendedProducts.forEach(prod => {
                productsHTML += `<div class="mb-6 pb-6 border-b border-gray-200"><h5 class="font-semibold text-lg text-gray-800">${prod.name}</h5><p class="text-gray-600 mb-3">${prod.description}</p><a href="${prod.affiliateLink}" target="_blank" class="cta-button font-medium py-2 px-4 rounded-lg text-sm">View Product<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div>`;
            });
            planSlide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="Personalized Plan" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Your Personalized Plan</h3><p class="feature-description mb-8">Based on your analysis, here are the most impactful product types we recommend.</p><div style="max-height: 350px; overflow-y: auto; padding-right: 1rem;">${productsHTML}</div><p class="text-xs text-gray-400 mt-4">As an Amazon Associate, AURA may earn from qualifying purchases. This is not medical advice.</p><div class="mt-8 pt-6 border-t border-gray-200"><h4 class="font-semibold text-lg text-gray-800">Ready for the next step?</h4><p class="text-gray-600 mb-4">Generate a photorealistic AI looksmatch.</p><button id="launch-looksmatch-btn" class="cta-button font-medium py-2 px-4 rounded-lg text-sm">Launch Looksmatch Generator</button></div></div>`;
            scrollContainer.appendChild(planSlide);
        }

        if (resultsNav) {
            resultsPage.insertBefore(scrollContainer, resultsNav);
        } else {
            resultsPage.appendChild(scrollContainer);
        }
        setupCarousel(scrollContainer);
    }

    function setupCarousel(scrollContainer) {
        const slides = Array.from(scrollContainer.querySelectorAll('.result-slide'));
        let currentSlide = 0;

        // This is the correct, working zoom function for an <img> tag
        function applyStaticZoom(slideElement) {
            const image = slideElement.querySelector('.result-image');
            if (!image) return;

            const bboxData = slideElement.dataset.bbox;
            const featureName = slideElement.dataset.featureName;

            if (bboxData && bboxData.trim() !== "") {
                try {
                    const bbox = JSON.parse(bboxData);
                    if (typeof bbox.x === 'number') {
                        const scale = 1 / Math.max(bbox.width, bbox.height) * 1.25;
                        const translateX = (0.5 - (bbox.x + bbox.width / 2)) * 100;
                        let initialTranslateY = (0.5 - (bbox.y + bbox.height / 2)) * 100;

                        if (featureName === 'Nose' || featureName === 'Mouth & Jaw') {
                            const verticalOffset = bbox.height * 20;
                            initialTranslateY -= verticalOffset;
                        }

                        image.style.transition = 'transform 0.4s ease-out';
                        image.style.transform = `scale(${scale}) translate(${translateX}%, ${initialTranslateY}%)`;
                        return;
                    }
                } catch (e) { console.error("Bbox parse error for zoom", e); }
            }
            // Reset for slides with no bbox data
            image.style.transition = 'transform 0.4s ease-out';
            image.style.transform = 'scale(1) translate(0%, 0%)';
        }

        if (!dotsContainer || !prevButton || !nextButton) return;
        dotsContainer.innerHTML = '';
        slides.forEach(() => {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dotsContainer.appendChild(dot);
        });
        const dots = Array.from(dotsContainer.querySelectorAll('.dot'));

        function updateUI() {
            if (slides[currentSlide]) applyStaticZoom(slides[currentSlide]);

            prevButton.disabled = currentSlide === 0;
            nextButton.disabled = currentSlide === slides.length - 1;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }

        function changeSlide(newIndex) {
            if (newIndex < 0 || newIndex >= slides.length) return;
            currentSlide = newIndex;
            scrollContainer.scrollTo({ left: currentSlide * window.innerWidth, behavior: 'smooth' });
            updateUI();
        }

        prevButton.onclick = () => changeSlide(currentSlide - 1);
        nextButton.onclick = () => changeSlide(currentSlide + 1);

        let scrollTimeout;
        scrollContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const newIndex = Math.round(scrollContainer.scrollLeft / window.innerWidth);
                if (newIndex !== currentSlide) {
                    currentSlide = newIndex;
                    updateUI();
                }
            }, 100);
        });

        updateUI(); // Initial call
    }

    // Looksmatch Page Logic
    const backToResultsBtn = document.getElementById('back-to-results-btn');
    const generateLooksmatchBtn = document.getElementById('generate-looksmatch-btn');
    const userPhotoContainer = document.getElementById('user-photo-container');
    const looksmatchPhotoContainer = document.getElementById('looksmatch-photo-container');

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'launch-looksmatch-btn') {
            if (uploadedFileUrl) {
                userPhotoContainer.innerHTML = `<img src="${uploadedFileUrl}" alt="Your Photo" class="w-full h-full object-cover rounded-lg">`;
            }
            showPage('looksmatch');
        }
    });

    if (backToResultsBtn) {
        backToResultsBtn.addEventListener('click', () => showPage('results'));
    }

    if (generateLooksmatchBtn) {
        generateLooksmatchBtn.addEventListener('click', async () => {
            if (!uploadedFile) {
                alert('Something went wrong. The original file is missing.');
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 60000);

            generateLooksmatchBtn.disabled = true;
            generateLooksmatchBtn.textContent = 'Generating...';
            looksmatchPhotoContainer.innerHTML = `<div class="placeholder loading"><div class="spinner"></div><p class="mt-4 text-sm text-gray-500">AI is thinking... this can take up to 60 seconds.</p></div>`;

            try {
                const formData = new FormData();
                formData.append('image', uploadedFile);

                const response = await fetch('/api/generate-looksmatch', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'The AI failed to generate an image.');
                }

                const result = await response.json();
                looksmatchPhotoContainer.innerHTML = `<img src="${result.looksmatchImage}" alt="Your AI Looksmatch" class="w-full h-full object-cover rounded-lg">`;

            } catch (error) {
                if (error.name === 'AbortError') {
                    alert('The request timed out. The AI model is taking too long to respond. Please try again in a moment.');
                    looksmatchPhotoContainer.innerHTML = `<div class="placeholder"><p class="text-sm text-red-500">Request timed out. Please try again.</p></div>`;
                } else {
                    console.error('Looksmatch generation failed:', error);
                    alert(`Error: ${error.message}`);
                    looksmatchPhotoContainer.innerHTML = `<div class="placeholder"><p class="text-sm text-red-500">Generation failed. Please try again.</p></div>`;
                }
            } finally {
                clearTimeout(timeoutId);
                generateLooksmatchBtn.disabled = false;
                generateLooksmatchBtn.textContent = 'Generate Your Looksmatch';
            }
        });
    }
});