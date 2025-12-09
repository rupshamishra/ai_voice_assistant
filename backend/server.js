const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Simple in-memory store
const userStates = {};

// COMPLETE RESPONSES WITH DETAILED EXPLANATIONS
const responses = {
    en: {
        welcome: "Hello! I am Sahayata. You can: 1. Send money, 2. Check balance, 3. Open account, 4. Loan information",
        ask_recipient: "Who do you want to send money to? Please say a name.",
        ask_amount: "How much money do you want to send? Say amount in rupees.",
        confirm_transfer: "I will send {amount} rupees to {recipient}. Say 'yes' to confirm.",
        processing: "Processing your payment...",
        otp_sent: "OTP sent to your phone: {otp}. Please enter this OTP.",
        success: "Payment successful! {amount} sent to {recipient}.",
        balance: "Your account balance is 15,000 rupees.",
        
        // DETAILED ACCOUNT OPENING INFO
        account_info: `To open a bank account, follow these steps:

📋 **Documents Required:**
1. Aadhaar Card (Mandatory)
2. PAN Card (For savings account)
3. Address Proof (Electricity bill, Rent agreement, Passport)
4. Passport-size photographs (2 copies)
5. Identity Proof (Voter ID, Driving License, Passport)

🏦 **Account Types:**
• Savings Account (4% interest, minimum balance ₹1000)
• Current Account (For business, no interest)
• Salary Account (Zero balance, auto debit)
• Senior Citizen Account (Higher interest rates)

📱 **How to Open:**
1. **Visit Bank Branch:** Go with original documents
2. **Online Opening:** Through our mobile app
3. **Video KYC:** Complete verification via video call

⏰ **Processing Time:** 1-2 working days
💳 **You will receive:** Debit Card, Cheque Book, Net Banking

Would you like me to connect you with a bank representative?`,

        // DETAILED LOAN INFORMATION
        loan_info: `We offer various loan options:

💰 **Personal Loan:**
• Amount: ₹50,000 to ₹10,00,000
• Interest: 10.5% to 16% per annum
• Tenure: 1 to 5 years
• Processing Fee: 1-2% of loan amount
• Documents: Salary slips, Bank statements, KYC

🏠 **Home Loan:**
• Amount: Up to ₹5,00,00,000
• Interest: 8.5% to 9.5% (floating)
• Tenure: Up to 30 years
• Margin: 10-20% of property value
• Documents: Property papers, Income proof, KYC

🎓 **Education Loan:**
• Amount: Up to ₹75,00,000
• Interest: 8.5% to 11.5%
• Moratorium: Course period + 6 months
• Collateral: Required above ₹7.5 lakhs
• Covers: Tuition, Hostel, Books, Travel

🏢 **Business Loan:**
• Amount: ₹1,00,000 to ₹2,00,00,000
• Interest: 12% to 18%
• Tenure: 1 to 10 years
• For: MSME, Startups, Traders
• Documents: Business proof, ITR, Bank statements

📞 **To Apply:** Call 1800-123-4567 or visit branch

Which loan are you interested in?`,

        not_understood: "Please say: Send money, Check balance, Open account, or Loan information."
    },
    hi: {
        welcome: "नमस्ते! मैं सहायता हूं। आप कर सकते हैं: 1. पैसे भेजें, 2. बैलेंस चेक करें, 3. खाता खोलें, 4. लोन की जानकारी",
        ask_recipient: "आप किसको पैसे भेजना चाहते हैं? कृपया नाम बताएं।",
        ask_amount: "आप कितने रुपये भेजना चाहते हैं? रुपये में राशि बताएं।",
        confirm_transfer: "मैं {recipient} को {amount} रुपये भेजूंगी। कन्फर्म करने के लिए 'हाँ' कहें।",
        processing: "आपका भुगतान प्रोसेस हो रहा है...",
        otp_sent: "आपके फोन पर OTP भेजा गया: {otp}. कृपया यह OTP डालें।",
        success: "भुगतान सफल! {recipient} को {amount} रुपये भेज दिए गए।",
        balance: "आपके खाते में 15,000 रुपये हैं।",
        
        // DETAILED ACCOUNT OPENING IN HINDI
        account_info: `बैंक खाता खोलने के लिए, इन चरणों का पालन करें:

📋 **आवश्यक दस्तावेज:**
1. आधार कार्ड (अनिवार्य)
2. पैन कार्ड (बचत खाते के लिए)
3. पता प्रमाण (बिजली बिल, किराया समझौता, पासपोर्ट)
4. पासपोर्ट साइज फोटो (2 कॉपी)
5. पहचान प्रमाण (मतदाता पहचान पत्र, ड्राइविंग लाइसेंस, पासपोर्ट)

🏦 **खाता प्रकार:**
• बचत खाता (4% ब्याज, न्यूनतम शेष ₹1000)
• चालू खाता (व्यापार के लिए, ब्याज नहीं)
• सैलरी खाता (जीरो बैलेंस, ऑटो डेबिट)
• वरिष्ठ नागरिक खाता (उच्च ब्याज दर)

📱 **कैसे खोलें:**
1. **बैंक शाखा जाएं:** मूल दस्तावेजों के साथ जाएं
2. **ऑनलाइन खोलें:** हमारे मोबाइल ऐप के माध्यम से
3. **वीडियो केवाईसी:** वीडियो कॉल के माध्यम से सत्यापन पूरा करें

⏰ **प्रोसेसिंग समय:** 1-2 कार्यदिवस
💳 **आपको मिलेगा:** डेबिट कार्ड, चेक बुक, नेट बैंकिंग

क्या आप मुझे बैंक प्रतिनिधि से जोड़ना चाहेंगे?`,

        // DETAILED LOAN INFORMATION IN HINDI
        loan_info: `हम विभिन्न ऋण विकल्प प्रदान करते हैं:

💰 **पर्सनल लोन:**
• राशि: ₹50,000 से ₹10,00,000
• ब्याज: 10.5% से 16% प्रति वर्ष
• अवधि: 1 से 5 वर्ष
• प्रोसेसिंग शुल्क: ऋण राशि का 1-2%
• दस्तावेज: वेतन पर्ची, बैंक स्टेटमेंट, केवाईसी

🏠 **होम लोन:**
• राशि: ₹5,00,00,000 तक
• ब्याज: 8.5% से 9.5% (फ्लोटिंग)
• अवधि: 30 वर्ष तक
• मार्जिन: संपत्ति मूल्य का 10-20%
• दस्तावेज: संपत्ति कागजात, आय प्रमाण, केवाईसी

🎓 **एजुकेशन लोन:**
• राशि: ₹75,00,000 तक
• ब्याज: 8.5% से 11.5%
• मोरेटोरियम: पाठ्यक्रम अवधि + 6 महीने
• संपार्श्विक: ₹7.5 लाख से ऊपर आवश्यक
• शामिल: ट्यूशन, छात्रावास, किताबें, यात्रा

🏢 **बिजनेस लोन:**
• राशि: ₹1,00,000 से ₹2,00,00,000
• ब्याज: 12% से 18%
• अवधि: 1 से 10 वर्ष
• के लिए: एमएसएमई, स्टार्टअप, व्यापारी
• दस्तावेज: व्यवसाय प्रमाण, आईटीआर, बैंक स्टेटमेंट

📞 **आवेदन करने के लिए:** 1800-123-4567 पर कॉल करें या शाखा में जाएं

आपकी किस ऋण में रुचि है?`,

        not_understood: "कृपया कहें: पैसे भेजो, बैलेंस चेक, खाता खोलो, या लोन की जानकारी।"
    },
    te: {
        welcome: "నమస్కారం! నేను సహాయత. మీరు చేయవచ్చు: 1. డబ్బు పంపండి, 2. బ్యాలెన్స్ తనిఖీ చేయండి, 3. ఖాతా తెరవండి, 4. లోన్ సమాచారం",
        ask_recipient: "మీరు ఎవరికి డబ్బు పంపాలనుకుంటున్నారు? దయచేసి పేరు చెప్పండి.",
        ask_amount: "మీరు ఎంత డబ్బు పంపాలనుకుంటున్నారు? రూపాయలలో మొత్తం చెప్పండి.",
        confirm_transfer: "నేను {recipient} కి {amount} రూపాయలు పంపుతాను. నిర్ధారించడానికి 'అవును' అనండి.",
        processing: "మీ చెల్లింపు ప్రాసెస్ అవుతోంది...",
        otp_sent: "మీ ఫోన్‌కు OTP పంపబడింది: {otp}. దయచేసి ఈ OTP నమోదు చేయండి.",
        success: "చెల్లింపు విజయవంతం! {recipient} కి {amount} రూపాయలు పంపబడ్డాయి.",
        balance: "మీ ఖాతాలో 15,000 రూపాయలు ఉన్నాయి.",
        
        // TELUGU DETAILED RESPONSES
        account_info: `బ్యాంక్ ఖాతా తెరవడానికి, ఈ దశలను అనుసరించండి:

📋 **అవసరమైన పత్రాలు:**
1. ఆధార్ కార్డ్ (తప్పనిసరి)
2. PAN కార్డ్ (సేవింగ్స్ ఖాతా కోసం)
3. చిరునామా రుజువు (విద్యుత్ బిల్లు, అద్దె ఒప్పందం, పాస్పోర్ట్)
4. పాస్పోర్ట్ సైజ్ ఫోటోలు (2 కాపీలు)
5. గుర్తింపు రుజువు (వోటర్ ఐడి, డ్రైవింగ్ లైసెన్స్, పాస్పోర్ట్)

🏦 **ఖాతా రకాలు:**
• సేవింగ్స్ ఖాతా (4% వడ్డీ, కనీస బ్యాలెన్స్ ₹1000)
• కరెంట్ ఖాతా (వ్యాపారం కోసం, వడ్డీ లేదు)
• సాలెరీ ఖాతా (జీరో బ్యాలెన్స్, ఆటో డెబిట్)
• సీనియర్ సిటిజన్ ఖాతా (ఎక్కువ వడ్డీ రేట్లు)

📱 **ఎలా తెరవాలి:**
1. **బ్యాంక్ శాఖకు వెళ్ళండి:** అసలు పత్రాలతో వెళ్ళండి
2. **ఆన్లైన్‌లో తెరవండి:** మా మొబైల్ యాప్ ద్వారా
3. **వీడియో KYC:** వీడియో కాల్ ద్వారా ధృవీకరణ పూర్తి చేయండి

⏰ **ప్రాసెసింగ్ సమయం:** 1-2 పని దినాలు
💳 **మీరు పొందుతారు:** డెబిట్ కార్డ్, చెక్ బుక్, నెట్ బ్యాంకింగ్

మీరు బ్యాంక్ ప్రతినిధితో కనెక్ట్ అవ్వాలనుకుంటున్నారా?`,

        loan_info: `మేము వివిధ రుణ ఎంపికలను అందిస్తాము:

💰 **పర్సనల్ లోన్:**
• మొత్తం: ₹50,000 నుండి ₹10,00,000
• వడ్డీ: సంవత్సరానికి 10.5% నుండి 16%
• కాలపరిమితి: 1 నుండి 5 సంవత్సరాలు
• ప్రాసెసింగ్ ఫీజు: రుణ మొత్తంలో 1-2%
• పత్రాలు: సాలెరీ స్లిప్స్, బ్యాంక్ స్టేట్మెంట్లు, KYC

🏠 **హోమ్ లోన్:**
• మొత్తం: ₹5,00,00,000 వరకు
• వడ్డీ: 8.5% నుండి 9.5% (ఫ్లోటింగ్)
• కాలపరిమితి: 30 సంవత్సరాలు వరకు
• మార్జిన్: ఆస్తి విలువలో 10-20%
• పత్రాలు: ఆస్తి పత్రాలు, ఆదాయ రుజువు, KYC

🎓 **ఎడ్యుకేషన్ లోన్:**
• మొత్తం: ₹75,00,000 వరకు
• వడ్డీ: 8.5% నుండి 11.5%
• మోరటోరియం: కోర్సు కాలం + 6 నెలలు
• కాలెటరల్: ₹7.5 లక్షలకు పైన అవసరం
• కవర్లు: ట్యూషన్, హోస్టెల్, పుస్తకాలు, ప్రయాణం

🏢 **బిజినెస్ లోన్:**
• మొత్తం: ₹1,00,000 నుండి ₹2,00,00,000
• వడ్డీ: 12% నుండి 18%
• కాలపరిమితి: 1 నుండి 10 సంవత్సరాలు
• కోసం: MSME, స్టార్టప్‌లు, వ్యాపారస్తులు
• పత్రాలు: వ్యాపార రుజువు, ITR, బ్యాంక్ స్టేట్మెంట్లు

📞 **దరఖాస్తు చేయడానికి:** 1800-123-4567కి కాల్ చేయండి లేదా శాఖకు వెళ్ళండి

మీకు ఏ రుణంలో ఆసక్తి ఉంది?`,

        not_understood: "దయచేసి చెప్పండి: డబ్బు పంపండి, బ్యాలెన్స్ తనిఖీ, ఖాతా తెరవండి, లేదా లోన్ సమాచారం."
    }
};

// SIMPLE CONVERSATION FLOW
app.post('/api/process-command', (req, res) => {
    try {
        const { command, language = 'hi', userId = 'default' } = req.body;
        
        console.log("🔊 User said:", command);
        console.log("🌍 Language:", language);
        console.log("👤 User ID:", userId);
        
        // Get user's current state or create new
        if (!userStates[userId]) {
            userStates[userId] = {
                step: 0,
                recipient: null,
                amount: null,
                otp: null
            };
        }
        
        const state = userStates[userId];
        const lang = responses[language] || responses.hi;
        const cmd = command.toLowerCase().trim();
        
        console.log("📊 Current step:", state.step);
        
        let response = {
            message: '',
            requiresOTP: false,
            otp: null,
            nextStep: null
        };
        
        // Handle different commands
        if (state.step === 0) {
            // Check what the user wants
            
            // SEND MONEY
            if (cmd.includes('send') || cmd.includes('भेज') || cmd.includes('పంపు') || 
                cmd.includes('money') || cmd.includes('पैसे') || cmd.includes('డబ్బు') ||
                cmd.includes('transfer') || cmd.includes('ट्रांसफर') || cmd.includes('ట్రాన్స్ఫర్')) {
                
                response.message = lang.ask_recipient;
                state.step = 1;
                console.log("➡️ Moving to step 1 (send money flow)");
                
            } 
            // CHECK BALANCE
            else if (cmd.includes('balance') || cmd.includes('बैलेंस') || cmd.includes('బ్యాలెన్స్') || 
                     cmd.includes('check') || cmd.includes('चेक') || cmd.includes('తనిఖీ')) {
                
                response.message = lang.balance;
                console.log("✅ Balance checked");
                
            } 
            // OPEN ACCOUNT
            else if (cmd.includes('account') || cmd.includes('खाता') || cmd.includes('ఖాతా') ||
                     cmd.includes('open') || cmd.includes('खोल') || cmd.includes('తెరవ') ||
                     cmd.includes('new account') || cmd.includes('नया खाता') || cmd.includes('కొత్త ఖాతా')) {
                
                response.message = lang.account_info;
                console.log("✅ Account info provided");
                
            } 
            // LOAN INFORMATION
            else if (cmd.includes('loan') || cmd.includes('लोन') || cmd.includes('లోన్') ||
                     cmd.includes('information') || cmd.includes('जानकारी') || cmd.includes('సమాచారం') ||
                     cmd.includes('borrow') || cmd.includes('कर्ज') || cmd.includes('రుణం')) {
                
                response.message = lang.loan_info;
                console.log("✅ Loan info provided");
                
            } else {
                response.message = lang.not_understood;
            }
            
        } else if (state.step === 1) {
            // Step 1: Asked for recipient
            const words = cmd.split(' ');
            let name = words[0];
            
            const commonNames = ['ramesh', 'suresh', 'mohan', 'sohan', 'ravi', 'kumar',
                                'रमेश', 'सुरेश', 'मोहन', 'सोहन', 'रवि', 'कुमार',
                                'రమేష్', 'సురేష్', 'మోహన్', 'రవి', 'కుమార్'];
            
            for (const commonName of commonNames) {
                if (cmd.includes(commonName)) {
                    name = commonName;
                    break;
                }
            }
            
            state.recipient = name;
            response.message = lang.ask_amount;
            state.step = 2;
            console.log(`✅ Got recipient: ${name}`);
            
        } else if (state.step === 2) {
            // Step 2: Asked for amount
            const numbers = cmd.match(/\d+/g);
            
            if (numbers && numbers.length > 0) {
                state.amount = numbers[0];
                response.message = lang.confirm_transfer
                    .replace('{recipient}', state.recipient)
                    .replace('{amount}', state.amount);
                state.step = 3;
                console.log(`✅ Got amount: ${state.amount}`);
            } else {
                response.message = lang.ask_amount;
            }
            
        } else if (state.step === 3) {
            // Step 3: Asked for confirmation
            const yesWords = ['yes', 'हाँ', 'हां', 'అవును', 'correct', 'ok', 'ठीक', 'సరే'];
            
            let isYes = false;
            for (const word of yesWords) {
                if (cmd.includes(word.toLowerCase())) {
                    isYes = true;
                    break;
                }
            }
            
            if (isYes) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                state.otp = otp;
                
                response.message = lang.processing + " " + lang.otp_sent.replace('{otp}', otp);
                response.requiresOTP = true;
                response.otp = otp;
                state.step = 4;
                console.log(`✅ User confirmed. OTP: ${otp}`);
            } else {
                response.message = lang.confirm_transfer
                    .replace('{recipient}', state.recipient)
                    .replace('{amount}', state.amount);
            }
            
        } else if (state.step === 4) {
            // Step 4: Waiting for OTP
            if (cmd.includes(state.otp) || (cmd.length === 6 && /^\d+$/.test(cmd))) {
                response.message = lang.success
                    .replace('{recipient}', state.recipient)
                    .replace('{amount}', state.amount);
                
                // Reset
                state.step = 0;
                state.recipient = null;
                state.amount = null;
                state.otp = null;
                console.log("✅ OTP verified. Transaction successful!");
            } else {
                response.message = lang.otp_sent.replace('{otp}', state.otp);
                response.requiresOTP = true;
                response.otp = state.otp;
            }
        }
        
        // Save state
        userStates[userId] = state;
        
        console.log("🤖 AI Response length:", response.message.length);
        console.log("---");
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.json({
            message: 'Sorry, technical error. Please try again.',
            requiresOTP: false
        });
    }
});

// Welcome endpoint
app.post('/api/welcome', (req, res) => {
    const { language = 'hi' } = req.body;
    const lang = responses[language] || responses.hi;
    res.json({ voiceMessage: lang.welcome });
});

// OTP verification endpoint
app.post('/api/verify-otp', (req, res) => {
    const { otp, userId } = req.body;
    const state = userStates[userId];
    
    if (state && state.otp === otp) {
        const lang = responses.hi;
        const successMsg = lang.success
            .replace('{recipient}', state.recipient || 'them')
            .replace('{amount}', state.amount || 'amount');
        
        // Reset
        userStates[userId] = { step: 0, recipient: null, amount: null, otp: null };
        
        res.json({
            success: true,
            message: successMsg
        });
    } else {
        res.json({
            success: false,
            message: 'Wrong OTP. Please try again.'
        });
    }
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
    console.log('🎯 DETAILED RESPONSES FOR:');
    console.log('   1. Send Money ✓');
    console.log('   2. Check Balance ✓');
    console.log('   3. Open Account ✓ (Detailed)');
    console.log('   4. Loan Info ✓ (Detailed)');
    console.log('🌍 Languages: Hindi, English, Telugu');
});