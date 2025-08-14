class SkincareAssistant {
    constructor() {
        this.userId = null;
        this.medicalChart = null;
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeSession();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.profileUpdate = document.getElementById('profileUpdate');
        this.updateProfileBtn = document.getElementById('updateProfileBtn');
        this.medicalChartContainer = document.getElementById('medicalChart');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.updateProfileBtn.addEventListener('click', () => this.updateProfile());
        this.profileUpdate.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.updateProfile();
            }
        });
    }

    async initializeSession() {
        // Check for existing session in localStorage
        const savedUserId = localStorage.getItem('skincareAssistantUserId');
        
        try {
            const response = await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: savedUserId })
            });

            const data = await response.json();
            this.userId = data.userId;
            this.medicalChart = data.medicalChart;
            
            // Save userId to localStorage
            localStorage.setItem('skincareAssistantUserId', this.userId);
            
            // Update the UI
            this.updateMedicalChartDisplay();
            
        } catch (error) {
            console.error('Error initializing session:', error);
            this.showError('Failed to initialize session. Please refresh the page.');
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        this.messageInput.value = '';

        // Show loading state
        this.setLoading(true);

        try {
            // Update medical chart with user input
            await this.updateMedicalChartFromInput(message);

            // Get AI advice
            const response = await fetch('/api/advice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    question: message
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessageToChat(data.advice, 'assistant');
            } else {
                throw new Error(data.error || 'Failed to get advice');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('Sorry, I encountered an error while processing your request. Please try again.', 'assistant');
        } finally {
            this.setLoading(false);
        }
    }

    async updateProfile() {
        const profileText = this.profileUpdate.value.trim();
        if (!profileText || this.isLoading) return;

        this.setLoading(true);

        try {
            await this.updateMedicalChartFromInput(profileText);
            this.profileUpdate.value = '';
            
            // Show success message
            this.addMessageToChat('Your skin profile has been updated! I\'ll use this information to provide more personalized advice.', 'assistant');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Failed to update profile. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async updateMedicalChartFromInput(userInput) {
        const response = await fetch('/api/update-chart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: this.userId,
                userInput: userInput
            })
        });

        if (response.ok) {
            const data = await response.json();
            this.medicalChart = data.medicalChart;
            this.updateMedicalChartDisplay();
        } else {
            throw new Error('Failed to update medical chart');
        }
    }

    addMessageToChat(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-3';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0';
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'chat-bubble';
        
        if (sender === 'user') {
            iconDiv.className += ' bg-gradient-to-r from-pink-400 to-purple-500';
            iconDiv.innerHTML = '<i class="fas fa-user text-white text-sm"></i>';
            messageDiv.className += ' justify-end';
            messageBubble.className += ' chat-bubble-user';
        } else {
            iconDiv.className += ' bg-gradient-to-r from-pink-400 to-purple-500';
            iconDiv.innerHTML = '<i class="fas fa-robot text-white text-sm"></i>';
            messageBubble.className += ' chat-bubble-assistant';
        }
        
        messageBubble.innerHTML = `<p>${this.formatMessage(message)}</p>`;
        
        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(messageBubble);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(message) {
        // Convert line breaks to <br> tags and escape HTML
        return message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    updateMedicalChartDisplay() {
        if (!this.medicalChart) return;

        let html = '';

        // Skin Type
        if (this.medicalChart.skinType) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Skin Type</h4>
                    <span class="profile-badge profile-badge-skin-type">
                        ${this.capitalizeFirst(this.medicalChart.skinType)}
                    </span>
                </div>
            `;
        }

        // Skin Concerns
        if (this.medicalChart.skinConcerns.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Primary Concerns</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.medicalChart.skinConcerns.map(concern => 
                            `<span class="profile-badge profile-badge-concern">${this.capitalizeFirst(concern)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Allergies
        if (this.medicalChart.allergies.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Allergies/Reactions</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.medicalChart.allergies.map(allergy => 
                            `<span class="profile-badge profile-badge-allergy">${this.capitalizeFirst(allergy)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Current Products
        if (this.medicalChart.currentProducts.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Current Products</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.medicalChart.currentProducts.map(product => 
                            `<span class="profile-badge profile-badge-product">${this.capitalizeFirst(product)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Environmental Factors
        if (this.medicalChart.environmentalFactors.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Environmental Factors</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.medicalChart.environmentalFactors.map(factor => 
                            `<span class="profile-badge">${this.capitalizeFirst(factor)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Lifestyle Factors
        if (this.medicalChart.lifestyleFactors.length > 0) {
            html += `
                <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700">Lifestyle Factors</h4>
                    <div class="flex flex-wrap gap-1">
                        ${this.medicalChart.lifestyleFactors.map(factor => 
                            `<span class="profile-badge">${this.capitalizeFirst(factor)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        // Last Updated
        if (this.medicalChart.lastUpdated) {
            const date = new Date(this.medicalChart.lastUpdated);
            html += `
                <div class="pt-2 border-t border-gray-200">
                    <p class="text-xs text-gray-500">
                        Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
                    </p>
                </div>
            `;
        }

        // If no data yet
        if (!html) {
            html = `
                <div class="text-center py-4">
                    <i class="fas fa-info-circle text-gray-400 text-2xl mb-2"></i>
                    <p class="text-sm text-gray-500">No profile data yet. Start chatting to build your skin profile!</p>
                </div>
            `;
        }

        this.medicalChartContainer.innerHTML = html;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.loadingOverlay.classList.toggle('hidden', !loading);
        this.sendMessageBtn.disabled = loading;
        this.updateProfileBtn.disabled = loading;
    }

    showError(message) {
        this.addMessageToChat(`Error: ${message}`, 'assistant');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SkincareAssistant();
}); 