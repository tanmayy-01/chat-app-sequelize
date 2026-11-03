const renderLogin = (req, res) => {
    return res.render('login', { title: 'Login | Chat App' });
};

const renderRegister = (req, res) => {
    return res.render('register', { title: 'Sign Up | Chat App' });
};

const renderChat = (req, res) => {
    return res.render('chat', {
        title: 'Real-Time Chat',
        currentUser: req.user
    });
};

const renderProfile = (req, res) => {
    return res.render('profile', {
        title: 'My Profile | Chat App',
        currentUser: req.user
    });
};

module.exports = {
    renderLogin,
    renderRegister,
    renderChat,
    renderProfile
};

