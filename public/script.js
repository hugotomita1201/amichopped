// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Page & Element Selection ---
    const pages = {
        home: document.getElementById('home-page'),
        upload: document.getElementById('upload-page'),
        results: document.getElementById('results-page'),
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
        if (score >= 8.0) return { tier: "Highly Attractive", percentile: "7.5%", position: 87.5 };
        if (score >= 7.0) return { tier: "Attractive", percentile: "20%", position: 77 };
        if (score >= 6.0) return { tier: "Above Average", percentile: "30%", position: 65 };
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

        // --- PART 1: Generate the FREE slides ---
        if (typeof data.overallScore === 'number') {
            const distInfo = getDistributionInfo(data.overallScore);
            const overallSlide = document.createElement('div');
            overallSlide.className = 'result-slide';
            overallSlide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="Your Photo" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Overall Analysis</h3><div class="flex items-center justify-center mb-4"><span class="rating-score">${data.overallScore.toFixed(1)}</span><span class="rating-total">/ 10</span></div><div class="distribution-chart-container"><div class="chart-statement"><h4>Where You Stand</h4><p>Your score places you in the <strong>top ${distInfo.percentile}</strong> of the population, within the <strong>${distInfo.tier}</strong>.</p></div><div class="distribution-chart"><svg class="chart-curve" viewBox="0 0 200 100" preserveAspectRatio="none"><path d="M0,100 C80,-40 120,40 200,100 Z"></path></svg><div class="chart-marker" style="left: ${distInfo.position}%;"></div></div><div class="chart-labels"><span>Below Avg.</span><span>Average</span><span>Attractive</span><span>Elite</span></div><p class="chart-disclaimer">Note: This chart reflects a right-skewed distribution of attractiveness.</p></div><p class="overall-summary">${data.overallSummary || 'A summary of your overall facial aesthetics.'}</p></div>`;
            scrollContainer.appendChild(overallSlide);
        }
        if (data.analysis && Array.isArray(data.analysis)) {
            data.analysis.forEach(item => {
                const slide = document.createElement('div');
                slide.className = 'result-slide';
                if (item.boundingBox) { slide.dataset.bbox = JSON.stringify(item.boundingBox); }
                if (item.featureName) { slide.dataset.featureName = item.featureName; }
                let ratingsGridHTML = '<div class="ratings-grid">';
                if (typeof item.aestheticRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Aesthetic</div><div class="rating-value-small">${item.aestheticRating.toFixed(1)}</div></div>`;
                if (typeof item.harmonyRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Harmony</div><div class="rating-value-small">${item.harmonyRating.toFixed(1)}</div></div>`;
                if (typeof item.healthRating === 'number') ratingsGridHTML += `<div class="rating-item"><div class="rating-label">Health</div><div class="rating-value-small">${item.healthRating.toFixed(1)}</div></div>`;
                ratingsGridHTML += '</div>';
                let lookalikeHTML = '';
                if (item.celebrityLookalike) lookalikeHTML = `<div class="lookalike-section"><div class="lookalike-icon"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg></div><p class="lookalike-text">Feature reminiscent of <strong>${item.celebrityLookalike}</strong></p></div>`;
                let featureProductHTML = '';
                if (item.recommendedProduct && item.featureProductReason) { featureProductHTML = `<div class="feature-product-recommendation" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; text-align: left;"><h4 style="font-weight: 600; color: #1f2937; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;"><svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>Product Recommendation</h4><p style="font-size: 1rem; color: #4b5563; margin-bottom: 0.5rem;"><strong>${item.recommendedProduct.name}:</strong> ${item.featureProductReason}</p><a href="${item.recommendedProduct.affiliateLink}" target="_blank" class="cta-button font-medium py-1 px-3 rounded-lg text-xs" style="background-color: #f3f4f6; color: #374151;">View Product<svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div>`; }
                slide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="${item.featureName || 'Feature Analysis'}" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">${item.featureName || 'Feature Analysis'}</h3>${ratingsGridHTML}<p class="feature-description">${item.reasoning || 'Detailed analysis of this feature.'}</p>${lookalikeHTML}${featureProductHTML}</div>`;
                scrollContainer.appendChild(slide);
            });
        }

        // --- PREMIUM CONTENT DISABLED ---
        /*
        // --- PART 2: Generate the "Unlock Premium" Paywall Slide ---
        const unlockSlide = document.createElement('div');
        unlockSlide.id = 'unlock-slide';
        unlockSlide.className = 'result-slide';
        unlockSlide.innerHTML = `
            <div class="result-image-panel" style="background-color: #e0f2fe;"><img src="${uploadedFileUrl}" alt="Your Action Plan" class="result-image" style="opacity: 0.5; filter: blur(4px);">
                <div style="position: absolute; text-align: center;">
                    <svg class="mx-auto h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
            </div>
            <div class="result-analysis-panel">
                <h3 class="feature-title">Unlock Your Full Report</h3>
                <p class="feature-description mb-6">Your free analysis is complete. For a one-time payment, unlock the premium report to see your full potential, your personalized action plan, and your AI-generated looksmatch.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; text-align: left; margin-bottom: 2rem;">
                    <h4 style="font-weight: 600; color: #1f2937;">Premium Report Includes:</h4>
                    <ul style="list-style-position: inside; color: #4b5563; margin-top: 0.5rem;">
                        <li>✓ Your True Potential Score</li>
                        <li>✓ Your AI-Generated Looksmatch</li>
                        <li>✓ Holistic Lifestyle & Product Plan</li>
                        <li>✓ In-depth Potential Summary</li>
                    </ul>
                </div>
                <a href="https://facemaxx.lemonsqueezy.com/buy/your-new-link-here" target="_blank" class="cta-button font-medium py-3 px-8 rounded-full text-base w-full">Unlock Now for $0.99</a>
                <button id="generate-premium-btn" class="font-medium text-sm text-gray-500 mt-4 hover:text-gray-800">I've already paid, generate my report.</button>
            </div>
        `;
        scrollContainer.appendChild(unlockSlide);
        */

        if (resultsNav) { resultsPage.insertBefore(scrollContainer, resultsNav); }
        else { resultsPage.appendChild(scrollContainer); }

        setupCarousel(scrollContainer);

        // --- PREMIUM CONTENT DISABLED ---
        /*
        // --- PART 3: Add the "Generate on Demand" logic ---
        document.getElementById('generate-premium-btn').addEventListener('click', async () => {
            const unlockButton = document.getElementById('generate-premium-btn');
            unlockButton.disabled = true;
            unlockButton.textContent = 'Generating... This may take up to 45 seconds.';
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
            const paywallSlide = document.getElementById('unlock-slide');

            try {
                const looksmatchResponse = await fetch('/api/generate-looksmatch', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({
                        ethnicity: data.probableEthnicity, 
                        gender: data.probableGender, 
                        overallScore: data.overallScore
                    })
                });
                if (!looksmatchResponse.ok) { const errorData = await looksmatchResponse.json(); throw new Error(errorData.error || 'Failed to generate looksmatch image.'); }
                const looksmatchData = await looksmatchResponse.json();
                if (paywallSlide) {
                    paywallSlide.remove();
                }

                const looksmatchSlide = document.createElement('div');
                looksmatchSlide.className = 'result-slide';
                looksmatchSlide.innerHTML = `<div class="result-image-panel"><img src="${looksmatchData.looksmatchImageData}" alt="Your AI Looksmatch" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Your AI Looksmatch</h3><p class="feature-description">This is an AI-generated looksmatch based on your facial structure and ethnicity, representing a similar level of attractiveness.</p></div>`;
                scrollContainer.appendChild(looksmatchSlide);

                if (typeof data.potentialScore === 'number' && data.potentialSummary) {
                    const potentialSlide = document.createElement('div');
                    potentialSlide.className = 'result-slide';
                    potentialSlide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="Your Potential" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Potential Analysis</h3><div class="potential-score-container" style="border-top: none; padding-top: 0; margin-top: 0;"><div class="potential-score-header"><svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"></path></svg><h4 class="potential-title">Your Potential Score</h4></div><div class="potential-score-value">${data.potentialScore.toFixed(1)} <span class="rating-total">/ 10</span></div><p class="potential-summary">${data.potentialSummary}</p></div></div>`;
                    scrollContainer.appendChild(potentialSlide);
                }

                if (data.holisticActionPlan && data.holisticActionPlan.keyImprovementAreas) {
                    const planSlide = document.createElement('div');
                    planSlide.className = 'result-slide';
                    let improvementAreasHTML = '';
                    data.holisticActionPlan.keyImprovementAreas.forEach(area => {
                        let lifestyleHTML = '';
                        if (area.lifestyleAdvice && area.lifestyleAdvice.length > 0) {
                            lifestyleHTML = `<h5 style="font-weight: 600; color: #1f2937; margin-top: 1rem; margin-bottom: 0.5rem;">Lifestyle Advice:</h5><ul style="list-style-position: inside; color: #4b5563; padding-left: 0.5rem; text-align: left;">${area.lifestyleAdvice.map(advice => `<li style="margin-bottom: 0.25rem;">${advice}</li>`).join('')}</ul>`;
                        }
                        let productsHTML = '';
                        if (area.productRecommendations && area.productRecommendations.length > 0) {
                            productsHTML = `<h5 style="font-weight: 600; color: #1f2937; margin-top: 1rem; margin-bottom: 0.5rem;">Recommended Products:</h5>${area.productRecommendations.map(prod => `<div style="text-align: left; margin-bottom: 1rem;"><p style="font-weight: 500; color: #374151;">${prod.name}</p><p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">${prod.description}</p><a href="${prod.affiliateLink}" target="_blank" class="cta-button font-medium py-1 px-3 rounded-lg text-xs" style="background-color: #f3f4f6; color: #374151;">View Product</a></div>`).join('')}`;
                        }
                        improvementAreasHTML += `<div style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #e5e7eb; text-align: center; width: 100%;"><h4 class="feature-title" style="font-size: 1.5rem;">${area.areaTitle}</h4><p class="feature-description" style="font-size: 1rem; margin-bottom: 1rem;">${area.problemStatement}</p>${lifestyleHTML}${productsHTML}</div>`;
                    });
                    planSlide.innerHTML = `<div class="result-image-panel"><img src="${uploadedFileUrl}" alt="Your Action Plan" class="result-image"></div><div class="result-analysis-panel"><h3 class="feature-title">Your Holistic Action Plan</h3><div class="action-plan-products">${improvementAreasHTML}</div><p class="feature-description" style="font-weight: 600;">${data.holisticActionPlan.finalEncouragement || ''}</p><p class="text-xs text-gray-400 mt-4">As an Amazon Associate, AURA may earn from qualifying purchases. This is not medical advice.</p></div>`;
                    scrollContainer.appendChild(planSlide);
                }

                setupCarousel(scrollContainer);
                alert('Your premium report is now unlocked!');

            } catch (error) {
                console.error('Premium content generation failed:', error);
                alert(`Error: ${error.message}`);
                unlockButton.disabled = false;
                unlockButton.textContent = 'I\'ve already paid, generate my report.';
            } finally {
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }
        });
        */
    }

    function setupCarousel(scrollContainer) {
        const slides = Array.from(scrollContainer.querySelectorAll('.result-slide'));
        let currentSlide = 0;

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
            if (slides.length === 0) return;
            if (slides[currentSlide]) {
                applyStaticZoom(slides[currentSlide]);
            }
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

        const looksmatchSlideElement = Array.from(slides).find(s => s.querySelector('img[alt*="Looksmatch"]'));
        if (looksmatchSlideElement) {
            const newIndex = slides.indexOf(looksmatchSlideElement);
            if (newIndex > -1) {
                changeSlide(newIndex);
            } else {
                updateUI();
            }
        } else {
            updateUI();
        }
    }
});