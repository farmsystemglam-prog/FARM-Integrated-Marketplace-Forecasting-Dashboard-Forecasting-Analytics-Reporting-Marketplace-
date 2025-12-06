
        // Supabase Configuration
        const SUPABASE_URL = 'https://nzpwmhshnfvwrbkhraed.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHdtaHNobmZ2d3Jia2hyYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzcyMTMsImV4cCI6MjA3OTExMzIxM30.IPQzkj0iuTEaxsmgY1fFva916rKcwaEfaAiBQhJHb_o';
        
        // Initialize Supabase
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Global variables
        let currentUser = null;
        let conversations = [];
        let currentConversation = null;
        let messages = [];

        // DOM elements
        const messageInput = document.getElementById('messageInput');
        const sendMessage = document.getElementById('sendMessage');
        const messagesList = document.getElementById('messagesList');

        // Dropdown toggle
        const profileBtn = document.getElementById("profileBtn");
        const dropdownMenu = document.getElementById("dropdownMenu");

        profileBtn.addEventListener("click", () => {
            dropdownMenu.style.display = 
                dropdownMenu.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.style.display = "none";
            }
        });

        // Message modal
        const messageBtn = document.getElementById("messageBtn");
        const messageModal = document.getElementById("messageModal");
        const closeModal = document.getElementById("closeModal");

        messageBtn.addEventListener("click", async () => {
            messageModal.style.display = "block";
            await checkUserAndLoadConversations();
        });

        closeModal.addEventListener("click", () => {
            messageModal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
            if (e.target === messageModal) {
                messageModal.style.display = "none";
            }
        });

        sendMessage.addEventListener("click", sendMessageHandler);
        messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendMessageHandler();
            }
        });

        // Check user and load conversations
        async function checkUserAndLoadConversations() {
            try {
                console.log('Checking user authentication...');
                const { data: { user }, error } = await supabase.auth.getUser();
                
                if (error) {
                    console.error('Auth error:', error);
                    showConversationsMessage('Please log in to view messages');
                    return;
                }
                
                currentUser = user;
                console.log('User authenticated:', user);
                await loadConversations();
            } catch (error) {
                console.error('Error checking user:', error);
                showConversationsMessage('Error loading messages');
            }
        }

        // Show message in conversations list
        function showConversationsMessage(message) {
            const conversationsList = document.getElementById("conversationsList");
            conversationsList.innerHTML = `<div class="no-conversations">${message}</div>`;
        }

        // Load conversations from Supabase
        async function loadConversations() {
            if (!currentUser) {
                console.log('No current user, skipping conversation load');
                return;
            }

            const conversationsList = document.getElementById("conversationsList");
            conversationsList.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading conversations...
                </div>
            `;

            try {
                console.log('Loading conversations...');
                
                // Get conversations where the current user is either farmer_id or customer_id
                const { data: conversationsData, error: conversationsError } = await supabase
                    .from('conversations')
                    .select('*')
                    .or(`farmer_id.eq.${currentUser.id},customer_id.eq.${currentUser.id}`)
                    .order('updated_at', { ascending: false });

                if (conversationsError) {
                    console.error('Error loading conversations:', conversationsError);
                    showConversationsMessage('Error loading conversations');
                    return;
                }

                console.log('Conversations loaded:', conversationsData);

                if (!conversationsData || conversationsData.length === 0) {
                    showConversationsMessage('No conversations yet');
                    return;
                }

                const conversationsWithInfo = await Promise.all(
                    conversationsData.map(async (conv) => {
                        // Determine the other user ID
                        const otherUserId = conv.farmer_id === currentUser.id ? conv.customer_id : conv.farmer_id;
                        
                        // Get the other user's profile
                        const { data: otherUser, error: userError } = await supabase
                            .from('auth.users')
                            .select('id, email')
                            .eq('id', otherUserId)
                            .single();
                        
                        if (userError) {
                            console.error('Error loading user:', userError);
                            return null;
                        }

                        // Get the last message for this conversation
                        const { data: lastMessage, error: messageError } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('conversation_id', conv.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();
                        
                        if (messageError && messageError.code !== 'PGRST116') { // PGRST116 = no rows returned
                            console.error('Error loading last message:', messageError);
                            return null;
                        }

                        // Check if the current user is the receiver of the last message and if it's unread
                        const isUnread = lastMessage && lastMessage.receiver_id === currentUser.id && !lastMessage.read_status;
                        
                        // Determine if the current user is the farmer in this conversation
                        const isFarmer = conv.farmer_id === currentUser.id;

                        return {
                            id: conv.id,
                            otherUserId: otherUserId,
                            otherUser: otherUser,
                            lastMessage: lastMessage,
                            unread: isUnread,
                            isFarmer: isFarmer
                        };
                    })
                );

                // Filter out any null results
                conversations = conversationsWithInfo.filter(c => c !== null);
                console.log('Conversations with info:', conversations);
                displayConversations();

            } catch (error) {
                console.error('Error loading conversations:', error);
                showConversationsMessage('Error loading conversations');
            }
        }

        // Display conversations in the sidebar
        function displayConversations() {
            const conversationsList = document.getElementById("conversationsList");
            
            if (conversations.length === 0) {
                conversationsList.innerHTML = '<div class="no-conversations">No conversations yet</div>';
                return;
            }

            conversationsList.innerHTML = conversations.map(conv => {
                const lastMessage = conv.lastMessage;
                const isUnread = conv.unread;
                const otherUser = conv.otherUser;
                const isFarmer = conv.isFarmer;
                
                // Use email as display name, or extract name from email if needed
                const otherUserName = otherUser ? otherUser.email.split('@')[0] : 'Unknown';
                
                const time = lastMessage ? formatDate(lastMessage.created_at) : '';
                const preview = lastMessage ? lastMessage.message.length > 30 ? 
                    lastMessage.message.substring(0, 30) + '...' : 
                    lastMessage.message : 'No messages yet';
                
                // Add position class based on whether the farmer is the receiver
                const positionClass = isFarmer ? 'farmer-receiver' : '';
                
                return `
                    <div class="conversation-item ${isUnread ? 'unread' : ''} ${positionClass}" data-id="${conv.id}">
                        <div class="conversation-avatar">
                            <div class="avatar-placeholder">${otherUserName.charAt(0).toUpperCase()}</div>
                        </div>
                        <div class="conversation-info">
                            <div class="conversation-header">
                                <h4>${otherUserName}</h4>
                                <span class="conversation-time">${time}</span>
                            </div>
                            <p class="conversation-preview">${preview}</p>
                        </div>
                        ${isUnread ? '<div class="unread-indicator"></div>' : ''}
                    </div>
                `;
            }).join('');

            // Add click handlers to conversation items
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.addEventListener('click', () => {
                    const convId = item.getAttribute('data-id');
                    const conversation = conversations.find(c => c.id === convId);
                    if (conversation) {
                        selectConversation(conversation);
                    }
                });
            });
        }

        // Select a conversation and load its messages
        async function selectConversation(conversation) {
            currentConversation = conversation;
            
            // Update chat header
            const otherUserName = conversation.otherUser ? conversation.otherUser.email.split('@')[0] : 'Unknown';
            document.getElementById('chatUserName').textContent = otherUserName;
            
            console.log('Conversation selected:', conversation);
            
            // Load messages for this conversation
            await loadMessagesForConversation(conversation);
            
            // Mark as read if the farmer is the receiver
            if (conversation.unread && conversation.isFarmer) {
                await markAsRead(conversation.lastMessage.id);
            }
        }

        // Load messages for a specific conversation
        async function loadMessagesForConversation(conversation) {
            if (!currentUser || !conversation) return;

            try {
                console.log('Loading messages for conversation:', conversation.id);
                
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversation.id)
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error loading messages:', error);
                    showMessagesInChat('Error loading messages');
                    return;
                }

                console.log('Messages loaded:', data);

                if (!data || data.length === 0) {
                    showMessagesInChat('No messages in this conversation');
                    return;
                }

                messages = data;
                displayMessagesInChat();

            } catch (error) {
                console.error('Error loading messages:', error);
                showMessagesInChat('Error loading messages');
            }
        }

        // Show message in chat area
        function showMessagesInChat(message) {
            messagesList.innerHTML = `<div class="system-message">${message}</div>`;
        }

        // Display messages in the chat area with updated styling
        function displayMessagesInChat() {
            if (messages.length === 0) {
                messagesList.innerHTML = '<div class="no-messages">No messages in this conversation</div>';
                return;
            }

            messagesList.innerHTML = messages.map(msg => {
                const isSender = msg.sender_id === currentUser.id;
                
                return `
                    <div class="chat-message ${isSender ? 'sent' : 'received'}">
                        <div class="message-bubble">
                            ${msg.message}
                        </div>
                        <div class="message-time">${formatDate(msg.created_at)}</div>
                    </div>
                `;
            }).join('');
            
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
        }

        // Mark message as read
        async function markAsRead(messageId) {
            try {
                // Update the conversation in the UI
                const convItem = document.querySelector(`.conversation-item[data-id="${currentConversation.id}"]`);
                if (convItem) {
                    convItem.classList.remove('unread');
                    convItem.querySelector('.unread-indicator')?.remove();
                }
                
                // Update read status in database
                const { error } = await supabase
                    .from('messages')
                    .update({ read_status: true })
                    .eq('id', messageId);
                
                if (error) {
                    console.error('Error marking as read:', error);
                }
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        // Updated send message handler with proper field mapping
        async function sendMessageHandler() {
            const content = messageInput.value.trim();

            if (!content || !currentUser || !currentConversation) {
                console.log('Cannot send message - missing data:', {
                    content: content,
                    currentUser: currentUser,
                    currentConversation: currentConversation
                });
                return;
            }

            try {
                console.log('Sending message:', content);
                console.log('Current conversation:', currentConversation);
                
                // Determine sender type based on current user role
                const senderType = 'farmer';
                
                // Insert the message into the messages table with all required fields
                const { data, error } = await supabase
                    .from('messages')
                    .insert([{
                        conversation_id: currentConversation.id,
                        sender_id: currentUser.id,
                        receiver_id: currentConversation.otherUserId, // Use the stored other user ID
                        message: content,
                        sender: senderType,
                        read_status: false,
                        created_at: new Date().toISOString() // Add timestamp
                    }])
                    .select();

                if (error) {
                    console.error('Error sending message:', error);
                    showMessagesInChat('Error sending message: ' + error.message);
                    return;
                }

                // Clear the input
                messageInput.value = '';
                
                // Add the new message to the current conversation
                const newMessage = data[0];
                messages.push(newMessage);
                displayMessagesInChat();
                
                // Update conversation preview
                const conversation = conversations.find(c => c.id === currentConversation.id);
                if (conversation) {
                    conversation.lastMessage = newMessage;
                    conversation.unread = false;
                    displayConversations();
                }

                console.log('Message sent successfully:', newMessage);
                console.log('Message saved to Supabase messages table with all required fields');

            } catch (error) {
                console.error('Error sending message:', error);
                showMessagesInChat('Error sending message: ' + error.message);
            }
        }

        // Format date helper
        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return date.toLocaleDateString([], { weekday: 'short' });
            } else {
                return date.toLocaleDateString();
            }
        }

        // WEATHER FUNCTIONS (unchanged)
        const API_KEY = "c808ae1a3efb9ae9248b1c893e5f6645"; 
        const CITY = "Batangas,PH";

        async function loadWeather() {
            try {
                const url = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&units=metric&appid=${API_KEY}`;
                const res = await fetch(url);
                const data = await res.json();

                let days = {};

                data.list.forEach(entry => {
                    const date = new Date(entry.dt_txt);
                    const d = date.getDate();
                    if (!days[d]) days[d] = entry;
                });

                const sorted = Object.keys(days).slice(0, 3);

                sorted.forEach((day, i) => {
                    const info = days[day];

                    document.getElementById(`day${i+1}-date`).textContent = day;
                    document.getElementById(`day${i+1}-month`).textContent =
                        new Date(info.dt_txt).toLocaleString("en-US", { month: "long" });
                    document.getElementById(`day${i+1}-temp`).textContent =
                        Math.round(info.main.temp) + "°";
                    document.getElementById(`day${i+1}-desc`).textContent =
                        info.weather[0].description;
                });

            } catch (error) {
                console.error("Weather fetch failed:", error);
            }
        }

        async function loadAirQuality(lat = 13.7565, lon = 121.0583) {
            const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                const aqi = data.list[0].main.aqi;
                const percent = Math.round((6 - aqi) * 20);

                const airQualityElement = document.querySelector(".metric:nth-child(1) h3");
                airQualityElement.textContent = percent + "%";

                let category = "";
                if (percent >= 80) category = "Good";
                else if (percent >= 60) category = "Fair";
                else if (percent >= 40) category = "Moderate";
                else if (percent >= 20) category = "Poor";
                else category = "Very Poor";

                airQualityElement.nextElementSibling?.remove();
                const label = document.createElement("p");
                label.style.fontSize = "13px";
                label.style.color = "#6a6a6a";
                label.textContent = category;
                airQualityElement.parentNode.appendChild(label);

            } catch (error) {
                console.error("Air Quality fetch failed:", error);
            }
        }

        async function loadRain(lat = 13.7565, lon = 121.0583) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                const list = data.hourly.precipitation;
                const latest = list[list.length - 1];

                const valueElement = document.querySelector("[data-type='rain'] h3");
                const labelElement = document.querySelector("[data-type='rain'] .rain-label");

                if (latest === null || latest === undefined) {
                    valueElement.textContent = "-- mm";
                    labelElement.textContent = "No Data";
                    return;
                }

                valueElement.textContent = latest + " mm";

                let category = "";
                if (latest === 0) category = "No Rain";
                else if (latest > 0 && latest <= 2) category = "Light Rain";
                else if (latest > 2 && latest <= 10) category = "Moderate Rain";
                else if (latest > 10 && latest <= 50) category = "Heavy Rain";
                else category = "Storm / Extreme Rain";

                labelElement.textContent = category;

            } catch (error) {
                console.error("Rainfall fetch failed:", error);
            }
        }

        async function loadHeatIndex(city = CITY) {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                const T = data.main.temp;
                const H = data.main.humidity;
                const Tf = (T * 9/5) + 32;

                const HI_F =
                    -42.379 +
                    2.04901523 * Tf +
                    10.14333127 * H -
                    0.22475541 * Tf * H -
                    0.00683783 * Tf * Tf -
                    0.05481717 * H * H +
                    0.00122874 * Tf * Tf * H +
                    0.00085282 * Tf * H * H -
                    0.00000199 * Tf * Tf * H * H;

                const HI_C = (HI_F - 32) * 5/9;

                const heatElement = document.querySelector("[data-type='heat'] h3");
                const labelElement = document.querySelector("[data-type='heat'] .heat-label");

                heatElement.textContent = HI_C.toFixed(1) + "°C";

                let category = "";
                if (HI_C < 27) category = "Comfortable";
                else if (HI_C < 32) category = "Caution";
                else if (HI_C < 41) category = "Extreme Caution";
                else if (HI_C < 54) category = "Danger";
                else category = "Extreme Danger";

                labelElement.textContent = category;

            } catch (error) {
                console.error("Heat Index fetch failed:", error);
            }
        }

        // Initialize weather functions
        document.addEventListener('DOMContentLoaded', () => {
            loadWeather();
            loadAirQuality();
            loadRain();
            loadHeatIndex();
        });