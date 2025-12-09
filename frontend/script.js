class SimpleVoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.language = 'hi'; // Start with Hindi
        this.userId = 'user-' + Math.random().toString(36).substr(2, 9);
        this.synth = window.speechSynthesis;
        this.isSpeaking = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initSpeechRecognition();
        this.speakWelcome();
    }

    setupEventListeners() {
        // Language selector
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            // Set up language options
            const languages = [
                { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
                { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
                { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' }
            ];
            
            languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.flag} ${lang.name}`;
                languageSelect.appendChild(option);
            });
            
            // Set Hindi as default
            languageSelect.value = 'hi';
            
            languageSelect.addEventListener('change', (e) => {
                this.language = e.target.value;
                this.updateLanguageUI();
                this.speakWelcome();
            });
        }

        // Voice button
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleListening();
            });
        }

        // Quick actions - FIXED: Use proper event delegation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                const action = e.target.dataset.action;
                console.log("🎯 Action button clicked:", action);
                this.handleQuickAction(action);
            }
        });

        // OTP verification
        const verifyBtn = document.getElementById('verifyBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this.verifyOTP();
            });
        }

        const otpInput = document.getElementById('otpInput');
        if (otpInput) {
            otpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyOTP();
                }
            });
        }

        // Spacebar shortcut for voice
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI();
                this.showStatus(this.getLocalizedMessage('listening'), 'listening');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("🎤 You said:", transcript);
                this.addUserMessage(transcript);
                this.processCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error("❌ Speech recognition error:", event.error);
                
                if (event.error === 'no-speech') {
                    this.showStatus(this.getLocalizedMessage('no_speech'), 'warning');
                    setTimeout(() => this.startListening(), 1000);
                } else if (event.error === 'audio-capture') {
                    this.showStatus(this.getLocalizedMessage('no_microphone'), 'error');
                } else if (event.error === 'not-allowed') {
                    this.showStatus(this.getLocalizedMessage('mic_blocked'), 'error');
                } else {
                    this.showStatus(this.getLocalizedMessage('speech_error'), 'error');
                }
                
                this.stopListening();
            };

            this.recognition.onend = () => {
                this.stopListening();
            };
        } else {
            this.showStatus(this.getLocalizedMessage('browser_not_supported'), 'error');
            this.addAIMessage(this.getLocalizedMessage('browser_not_supported'));
        }
    }

    async processCommand(command) {
        try {
            console.log("🔄 Processing command:", command);
            
            this.showStatus(this.getLocalizedMessage('processing'), 'info');
            
            const response = await fetch('/api/process-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: command,
                    language: this.language,
                    userId: this.userId
                })
            });

            const result = await response.json();
            console.log("🤖 Server response received");
            
            // Split long messages for better display
            const displayMessage = this.formatLongMessage(result.message);
            this.addAIMessage(displayMessage);
            
            // Speak only first part of long messages
            const speakMessage = result.message.split('\n')[0];
            this.speakText(speakMessage);
            
            if (result.requiresOTP) {
                this.showOTP(result.otp);
            }
            
        } catch (error) {
            console.error("❌ Error:", error);
            const errorMsg = this.getLocalizedMessage('network_error');
            this.addAIMessage(errorMsg);
            this.speakText(errorMsg);
        }
    }

    formatLongMessage(message) {
        // Format message with line breaks for better readability
        return message
            .split('\n')
            .map(line => {
                if (line.includes('**')) {
                    // Format bold text
                    return line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                }
                if (line.trim().startsWith('•') || line.trim().startsWith('1.') || line.trim().startsWith('2.') || 
                    line.trim().startsWith('3.') || line.trim().startsWith('4.') || line.trim().startsWith('5.')) {
                    // Format list items
                    return `<div style="margin-left: 20px; margin-top: 5px;">${line}</div>`;
                }
                if (line.includes('📋') || line.includes('🏦') || line.includes('📱') || 
                    line.includes('⏰') || line.includes('💳') || line.includes('💰') || 
                    line.includes('🏠') || line.includes('🎓') || line.includes('🏢') || 
                    line.includes('📞')) {
                    // Format emoji sections
                    return `<div style="margin-top: 15px; font-weight: bold;">${line}</div>`;
                }
                return line;
            })
            .join('<br>');
    }

    speakText(text) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        this.isSpeaking = true;
        this.updateUI();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language based on selection
        const langMap = {
            'hi': 'hi-IN',
            'en': 'en-IN',
            'te': 'te-IN',
            'bn': 'bn-IN',
            'ta': 'ta-IN'
        };
        
        utterance.lang = langMap[this.language] || 'hi-IN';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to get a good voice
        utterance.onstart = () => {
            this.showStatus(this.getLocalizedMessage('speaking'), 'speaking');
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateUI();
            
            // Auto-start listening after speaking (except when OTP is shown)
            const otpSection = document.getElementById('otpSection');
            if (!otpSection || otpSection.classList.contains('hidden')) {
                setTimeout(() => {
                    this.showStatus(this.getLocalizedMessage('ready_to_listen'), 'ready');
                    this.startListening();
                }, 1000);
            } else {
                this.showStatus(this.getLocalizedMessage('enter_otp'), 'info');
            }
        };

        utterance.onerror = (event) => {
            this.isSpeaking = false;
            this.updateUI();
            console.error('❌ Speech error:', event);
            this.showStatus(this.getLocalizedMessage('tts_error'), 'error');
            
            // Still try to start listening
            setTimeout(() => {
                this.startListening();
            }, 1000);
        };

        this.synth.speak(utterance);
    }

    speakWelcome() {
        const welcomeMsg = this.getLocalizedMessage('welcome');
        this.addAIMessage(welcomeMsg);
        
        setTimeout(() => {
            this.speakText(welcomeMsg);
        }, 1000);
    }

    handleQuickAction(action) {
        console.log("🔄 Quick action clicked:", action);
        
        const commands = {
            'hi': {
                'balance': 'बैलेंस चेक करो',
                'transfer': 'पैसे भेजो',
                'account': 'खाता खोलना है',
                'loan': 'लोन की जानकारी चाहिए',
                'upi': 'यूपीआई के बारे में बताओ'
            },
            'en': {
                'balance': 'check balance',
                'transfer': 'send money',
                'account': 'I want to open account',
                'loan': 'I need loan information',
                'upi': 'tell me about UPI'
            },
            'te': {
                'balance': 'బ్యాలెన్స్ తనిఖీ చేయండి',
                'transfer': 'డబ్బు పంపండి',
                'account': 'నాకు ఖాతా తెరవాలి',
                'loan': 'నాకు లోన్ సమాచారం కావాలి',
                'upi': 'యుపిఐ గురించి చెప్పండి'
            },
            'bn': {
                'balance': 'ব্যালেন্স চেক করুন',
                'transfer': 'টাকা পাঠান',
                'account': 'আমি অ্যাকাউন্ট খুলতে চাই',
                'loan': 'আমার ঋণ তথ্য প্রয়োজন',
                'upi': 'ইউপিআই সম্পর্কে বলুন'
            },
            'ta': {
                'balance': 'இருப்பு சரிபார்க்கவும்',
                'transfer': 'பணம் அனுப்பவும்',
                'account': 'எனக்கு கணக்கு திறக்க வேண்டும்',
                'loan': 'எனக்கு கடன் தகவல் தேவை',
                'upi': 'யூபிஐ பற்றி சொல்லுங்கள்'
            }
        };
        
        const langCommands = commands[this.language] || commands.hi;
        
        if (langCommands[action]) {
            const commandText = langCommands[action];
            console.log("🎯 Sending command:", commandText);
            this.addUserMessage(commandText);
            this.processCommand(commandText);
        } else {
            console.error("❌ No command found for action:", action);
            this.addAIMessage("Sorry, this option is not working. Please try another.");
        }
    }

    // UI Methods
    addUserMessage(text) {
        this.addMessage(text, 'user-message', this.getLocalizedMessage('you'));
    }

    addAIMessage(text) {
        this.addMessage(text, 'ai-message', this.getLocalizedMessage('ai_name'));
    }

    addMessage(text, className, sender) {
        const conv = document.getElementById('conversation');
        if (!conv) {
            console.error('❌ Conversation element not found');
            return;
        }
        
        const msg = document.createElement('div');
        msg.className = `message ${className}`;
        
        // Add flag for AI messages
        const flag = this.getLanguageFlag();
        
        if (className === 'ai-message') {
            msg.innerHTML = `<strong>${flag} ${sender}:</strong><br>${text}`;
        } else {
            msg.innerHTML = `<strong>${sender}:</strong> ${this.escapeHtml(text)}`;
        }
        
        conv.appendChild(msg);
        conv.scrollTop = conv.scrollHeight;
    }

    getLanguageFlag() {
        const flags = {
            'hi': '🇮🇳',
            'en': '🇺🇸',
            'te': '🇮🇳',
            'bn': '🇧🇩',
            'ta': '🇮🇳'
        };
        return flags[this.language] || '🗣️';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showOTP(otp) {
        const otpValue = document.getElementById('otpValue');
        const otpSection = document.getElementById('otpSection');
        
        if (otpValue && otpSection) {
            otpValue.textContent = otp;
            otpSection.classList.remove('hidden');
            
            const otpInput = document.getElementById('otpInput');
            if (otpInput) {
                otpInput.focus();
            }
            
            this.showStatus(`${this.getLocalizedMessage('otp_sent')}: ${otp}`, 'otp');
        }
    }

    async verifyOTP() {
        const input = document.getElementById('otpInput');
        if (!input) return;
        
        const otp = input.value.trim();
        if (!otp) {
            this.showStatus(this.getLocalizedMessage('enter_otp_first'), 'warning');
            return;
        }
        
        try {
            this.showStatus(this.getLocalizedMessage('verifying_otp'), 'info');
            
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    otp: otp,
                    userId: this.userId
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.addUserMessage(this.getLocalizedMessage('otp_verified'));
                this.addAIMessage(result.message);
                this.speakText(result.message);
                
                const otpSection = document.getElementById('otpSection');
                if (otpSection) {
                    otpSection.classList.add('hidden');
                }
                
                if (input) {
                    input.value = '';
                }
            } else {
                this.addUserMessage(this.getLocalizedMessage('wrong_otp'));
                this.addAIMessage(result.message || this.getLocalizedMessage('wrong_otp'));
                this.speakText(result.message || this.getLocalizedMessage('wrong_otp'));
            }
        } catch (error) {
            console.error('❌ OTP verification error:', error);
            const errorMsg = this.getLocalizedMessage('otp_error');
            this.addAIMessage(errorMsg);
            this.speakText(errorMsg);
        }
    }

    updateLanguageUI() {
        const config = this.languageConfig[this.language];
        if (config) {
            const select = document.getElementById('language');
            if (select) {
                const option = select.options[select.selectedIndex];
                if (option) {
                    option.text = `${config.flag} ${config.name}`;
                }
            }
            
            // Update button text
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.innerHTML = `${config.flag} ${config.speakText}`;
            }
            
            this.showStatus(`${this.getLocalizedMessage('language_changed')} ${config.name}`, 'success');
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = 'status';
        
        if (type) {
            statusEl.classList.add(`status-${type}`);
        }
    }

    toggleListening() {
        if (this.isSpeaking) {
            this.synth.cancel();
            this.isSpeaking = false;
            this.updateUI();
            setTimeout(() => this.startListening(), 500);
        } else if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (this.recognition && !this.isSpeaking) {
            const langMap = {
                'hi': 'hi-IN',
                'en': 'en-IN',
                'te': 'te-IN',
                'bn': 'bn-IN',
                'ta': 'ta-IN'
            };
            
            this.recognition.lang = langMap[this.language] || 'hi-IN';
            
            try {
                this.recognition.start();
            } catch (error) {
                console.error('❌ Error starting recognition:', error);
                this.showStatus(this.getLocalizedMessage('recognition_error'), 'error');
                setTimeout(() => this.startListening(), 1000);
            }
        }
    }

    stopListening() {
        this.isListening = false;
        this.updateUI();
        this.showStatus(this.getLocalizedMessage('click_to_speak'), 'ready');
    }

    updateUI() {
        const btn = document.getElementById('voiceBtn');
        if (!btn) return;
        
        btn.classList.remove('listening');
        
        if (this.isSpeaking) {
            btn.classList.add('listening');
            btn.innerHTML = '🔊 ' + this.getLocalizedMessage('ai_speaking');
            btn.style.background = 'linear-gradient(135deg, #00b894, #00a085)';
        } else if (this.isListening) {
            btn.classList.add('listening');
            btn.innerHTML = '🎤 ' + this.getLocalizedMessage('listening');
            btn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
        } else {
            btn.innerHTML = '🎤 ' + this.getLocalizedMessage('click_to_speak');
            btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }
    }

    clearConversation() {
        const conv = document.getElementById('conversation');
        if (conv) {
            conv.innerHTML = '';
            const welcomeMsg = this.getLocalizedMessage('welcome');
            this.addAIMessage(welcomeMsg);
            this.showStatus(this.getLocalizedMessage('conversation_cleared'), 'info');
        }
    }

    // Localization methods
    getLocalizedMessage(key) {
        const messages = {
            'welcome': {
                'hi': "नमस्ते! मैं सहायता हूं। आप कर सकते हैं: 1. पैसे भेजें, 2. बैलेंस चेक करें, 3. खाता खोलें, 4. लोन की जानकारी",
                'en': "Hello! I am Sahayata. You can: 1. Send money, 2. Check balance, 3. Open account, 4. Loan information",
                'te': "నమస్కారం! నేను సహాయత. మీరు చేయవచ్చు: 1. డబ్బు పంపండి, 2. బ్యాలెన్స్ తనిఖీ చేయండి, 3. ఖాతా తెరవండి, 4. లోన్ సమాచారం",
                'bn': "নমস্কার! আমি সাহায্য। আপনি করতে পারেন: 1. টাকা পাঠান, 2. ব্যালেন্স চেক করুন, 3. অ্যাকাউন্ট খোলা, 4. ঋণ তথ্য",
                'ta': "வணக்கம்! நான் சஹாயதா. நீங்கள் செய்யலாம்: 1. பணம் அனுப்பு, 2. இருப்பு சரிபார், 3. கணக்கு திற, 4. கடன் தகவல்"
            },
            'you': {
                'hi': 'आप',
                'en': 'You',
                'te': 'మీరు',
                'bn': 'আপনি',
                'ta': 'நீங்கள்'
            },
            'ai_name': {
                'hi': 'सहायता',
                'en': 'Sahayata',
                'te': 'సహాయత',
                'bn': 'সাহায্য',
                'ta': 'சஹாயதா'
            },
            'listening': {
                'hi': '🎤 सुन रहा हूं... बोलिए',
                'en': '🎤 Listening... Speak now',
                'te': '🎤 విన్నాను... మాట్లాడండి',
                'bn': '🎤 শুনছি... বলুন',
                'ta': '🎤 கேட்கிறேன்... பேசுங்கள்'
            },
            'speaking': {
                'hi': '🔊 बोल रहा हूं...',
                'en': '🔊 Speaking...',
                'te': '🔊 మాట్లాడుతున్నాను...',
                'bn': '🔊 বলছি...',
                'ta': '🔊 பேசுகிறேன்...'
            },
            'ready_to_listen': {
                'hi': 'बोलने के लिए तैयार',
                'en': 'Ready to listen',
                'te': 'వినడానికి సిద్ధంగా ఉంది',
                'bn': 'শোনার জন্য প্রস্তুত',
                'ta': 'கேட்பதற்குத் தயாராக உள்ளது'
            },
            'click_to_speak': {
                'hi': 'क्लिक करके बोलें',
                'en': 'Click to speak',
                'te': 'మాట్లాడటానికి క్లిక్ చేయండి',
                'bn': 'বলতে ক্লিক করুন',
                'ta': 'பேச கிளிக் செய்யவும்'
            },
            'ai_speaking': {
                'hi': 'एआई बोल रहा है',
                'en': 'AI Speaking',
                'te': 'AI మాట్లాడుతోంది',
                'bn': 'এআই কথা বলছে',
                'ta': 'AI பேசுகிறது'
            },
            'processing': {
                'hi': 'प्रोसेस हो रहा है...',
                'en': 'Processing...',
                'te': 'ప్రాసెస్ చేస్తోంది...',
                'bn': 'প্রসেস হচ্ছে...',
                'ta': 'செயல்படுத்துகிறது...'
            },
            'enter_otp': {
                'hi': 'OTP डालें या बोलें',
                'en': 'Enter or speak OTP',
                'te': 'OTP నమోదు చేయండి లేదా మాట్లాడండి',
                'bn': 'OTP লিখুন বা বলুন',
                'ta': 'OTP உள்ளிடவும் அல்லது பேசவும்'
            },
            'enter_otp_first': {
                'hi': 'पहले OTP डालें',
                'en': 'Please enter OTP first',
                'te': 'ముందుగా OTP నమోదు చేయండి',
                'bn': 'প্রথমে OTP লিখুন',
                'ta': 'முதலில் OTP ஐ உள்ளிடவும்'
            },
            'otp_sent': {
                'hi': 'OTP भेजा गया',
                'en': 'OTP sent',
                'te': 'OTP పంపబడింది',
                'bn': 'OTP পাঠানো হয়েছে',
                'ta': 'OTP அனுப்பப்பட்டது'
            },
            'otp_verified': {
                'hi': 'OTP सत्यापित',
                'en': 'OTP Verified',
                'te': 'OTP ధృవీకరించబడింది',
                'bn': 'OTP যাচাই করা হয়েছে',
                'ta': 'OTP சரிபார்க்கப்பட்டது'
            },
            'verifying_otp': {
                'hi': 'OTP सत्यापित हो रहा है...',
                'en': 'Verifying OTP...',
                'te': 'OTP ధృవీకరిస్తోంది...',
                'bn': 'OTP যাচাই করা হচ্ছে...',
                'ta': 'OTP சரிபார்க்கிறது...'
            },
            'wrong_otp': {
                'hi': 'गलत OTP, फिर कोशिश करें',
                'en': 'Wrong OTP, please try again',
                'te': 'తప్పు OTP, మళ్లీ ప్రయత్నించండి',
                'bn': 'ভুল OTP, আবার চেষ্টা করুন',
                'ta': 'தவறான OTP, மீண்டும் முயற்சிக்கவும்'
            },
            'no_speech': {
                'hi': 'आवाज नहीं सुनाई दी, फिर बोलें',
                'en': 'No speech detected, please speak again',
                'te': 'భాష గుర్తించబడలేదు, దయచేసి మళ్లీ మాట్లాడండి',
                'bn': 'কোনো কথা শোনা যায়নি, আবার বলুন',
                'ta': 'பேச்சு கண்டறியப்படவில்லை, மீண்டும் பேசவும்'
            },
            'no_microphone': {
                'hi': 'माइक्रोफोन नहीं मिला',
                'en': 'Microphone not found',
                'te': 'మైక్రోఫోన్ కనుగొనబడలేదు',
                'bn': 'মাইক্রোফোন পাওয়া যায়নি',
                'ta': 'மைக்ரோஃபோன் கண்டறியப்படவில்லை'
            },
            'mic_blocked': {
                'hi': 'माइक्रोफोन एक्सेस ब्लॉक है',
                'en': 'Microphone access blocked',
                'te': 'మైక్రోఫోన్ యాక్సెస్ నిరోధించబడింది',
                'bn': 'মাইক্রোফোন অ্যাক্সেস ব্লক করা হয়েছে',
                'ta': 'மைக்ரோஃபோன் அணுகல் தடுக்கப்பட்டது'
            },
            'speech_error': {
                'hi': 'आवाज त्रुटि, फिर कोशिश करें',
                'en': 'Speech error, please try again',
                'te': 'భాష దోషం, దయచేసి మళ్లీ ప్రయత్నించండి',
                'bn': 'বক্তৃতা ত্রুটি, আবার চেষ্টা করুন',
                'ta': 'பேச்சு பிழை, மீண்டும் முயற்சிக்கவும்'
            },
            'tts_error': {
                'hi': 'बोलने में त्रुटि',
                'en': 'Error in speaking',
                'te': 'మాట్లాడడంలో దోషం',
                'bn': 'বলার সময় ত্রুটি',
                'ta': 'பேசுவதில் பிழை'
            },
            'recognition_error': {
                'hi': 'आवाज पहचान त्रुटि',
                'en': 'Speech recognition error',
                'te': 'భాష గుర్తింపు దోషం',
                'bn': 'বক্তৃতা স্বীকৃতি ত্রুটি',
                'ta': 'பேச்சு அங்கீகார பிழை'
            },
            'network_error': {
                'hi': 'नेटवर्क त्रुटि, कृपया फिर कोशिश करें',
                'en': 'Network error, please try again',
                'te': 'నెట్‌వర్క్ దోషం, దయచేసి మళ్లీ ప్రయత్నించండి',
                'bn': 'নেটওয়ার্ক ত্রুটি, আবার চেষ্টা করুন',
                'ta': 'பிணைய பிழை, மீண்டும் முயற்சிக்கவும்'
            },
            'otp_error': {
                'hi': 'OTP त्रुटि, फिर कोशिश करें',
                'en': 'OTP error, please try again',
                'te': 'OTP దోషం, దయచేసి మళ్లీ ప్రయత్నించండి',
                'bn': 'OTP ত্রুটি, আবার চেষ্টা করুন',
                'ta': 'OTP பிழை, மீண்டும் முயற்சிக்கவும்'
            },
            'language_changed': {
                'hi': 'भाषा बदली:',
                'en': 'Language changed to:',
                'te': 'భాష మార్చబడింది:',
                'bn': 'ভাষা পরিবর্তন হয়েছে:',
                'ta': 'மொழி மாற்றப்பட்டது:'
            },
            'conversation_cleared': {
                'hi': 'बातचीत साफ हुई',
                'en': 'Conversation cleared',
                'te': 'సంభాషణ క్లియర్ చేయబడింది',
                'bn': 'কথোপকথন সাফ করা হয়েছে',
                'ta': 'உரையாடல் அழிக்கப்பட்டது'
            },
            'browser_not_supported': {
                'hi': 'ब्राउज़र सपोर्ट नहीं करता। Chrome इस्तेमाल करें।',
                'en': 'Browser not supported. Please use Chrome.',
                'te': 'బ్రౌజర్ సపోర్ట్ లేదు. దయచేసి Chrome ఉపయోగించండి.',
                'bn': 'ব্রাউজার সমর্থিত নয়। দয়া করে Chrome ব্যবহার করুন।',
                'ta': 'உலாவி ஆதரிக்கப்படவில்லை. தயவுசெய்து Chrome பயன்படுத்தவும்.'
            }
        };
        
        return messages[key] ? (messages[key][this.language] || messages[key]['hi']) : key;
    }

    get languageConfig() {
        return {
            'hi': {
                flag: '🇮🇳',
                name: 'हिंदी',
                speakText: 'क्लिक करके बोलें'
            },
            'en': {
                flag: '🇺🇸',
                name: 'English',
                speakText: 'Click to speak'
            },
            'te': {
                flag: '🇮🇳',
                name: 'తెలుగు',
                speakText: 'క్లిక్ చేసి మాట్లాడండి'
            },
            'bn': {
                flag: '🇧🇩',
                name: 'বাংলা',
                speakText: 'ক্লিক করুন এবং বলুন'
            },
            'ta': {
                flag: '🇮🇳',
                name: 'தமிழ்',
                speakText: 'கிளிக் செய்து பேசுங்கள்'
            }
        };
    }
}

// Add CSS for better UI with formatting
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = `
    .language-selector {
        margin: 20px 0;
        text-align: center;
        padding: 15px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 10px;
        color: white;
    }
    
    .language-selector label {
        font-weight: bold;
        font-size: 1.1rem;
        margin-right: 10px;
    }
    
    .language-selector select {
        padding: 10px 20px;
        border: 2px solid white;
        border-radius: 8px;
        font-size: 1rem;
        background: rgba(255,255,255,0.9);
        color: #333;
        cursor: pointer;
        min-width: 200px;
    }
    
    .conversation {
        background: #f8f9fa;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        padding: 20px;
        min-height: 300px;
        max-height: 400px;
        overflow-y: auto;
        font-size: 1rem;
        line-height: 1.5;
    }
    
    .message {
        margin: 15px 0;
        padding: 12px 15px;
        border-radius: 18px;
        max-width: 85%;
        position: relative;
        animation: fadeIn 0.3s ease-out;
        word-wrap: break-word;
        line-height: 1.4;
    }
    
    .user-message {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 5px;
        text-align: left;
    }
    
    .ai-message {
        background: linear-gradient(135deg, #4facfe, #00f2fe);
        color: white;
        margin-right: auto;
        border-bottom-left-radius: 5px;
        text-align: left;
    }
    
    .ai-message strong {
        display: block;
        margin-bottom: 8px;
        font-size: 1.1rem;
    }
    
    .status {
        padding: 8px 15px;
        border-radius: 20px;
        display: inline-block;
        margin: 10px;
        font-size: 0.9rem;
        background: #f8f9fa;
        color: #666;
        border: 2px solid #e9ecef;
        transition: all 0.3s ease;
        min-width: 200px;
        text-align: center;
    }
    
    .status-listening {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        animation: pulse 1.5s infinite;
        border-color: #ff6b6b;
    }
    
    .status-speaking {
        background: linear-gradient(135deg, #00b894, #00a085);
        color: white;
        border-color: #00b894;
    }
    
    .status-otp {
        background: linear-gradient(135deg, #4facfe, #00f2fe);
        color: white;
        border-color: #4facfe;
    }
    
    .status-info {
        background: linear-gradient(135deg, #a8edea, #fed6e3);
        color: #333;
        border-color: #a8edea;
    }
    
    .status-success {
        background: linear-gradient(135deg, #84fab0, #8fd3f4);
        color: #333;
        border-color: #84fab0;
    }
    
    .status-warning {
        background: linear-gradient(135deg, #f6d365, #fda085);
        color: #333;
        border-color: #f6d365;
}