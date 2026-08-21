import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* ================= FIREBASE ================= */

const firebaseConfig = {
    apiKey: "AIzaSyDVEmiZf89Y-frmf2iTGtq0Z8m0JbcEqeo",
    authDomain: "ali-c3b41.firebaseapp.com",
    projectId: "ali-c3b41",
    storageBucket: "ali-c3b41.firebasestorage.app",
    messagingSenderId: "652613810202",
    appId: "1:652613810202:web:f76de886c9856952d0f9a3",
    measurementId: "G-5V26CMHDQ0"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* ================= VARIABLES ================= */

let currentUser = null;
let allUsers = [];
let allPosts = [];
let currentImage = "";
let unsubscribePosts = null;


/* ================= HELPERS ================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);


/* ================= AUTH SWITCH ================= */

$("#showRegister")?.addEventListener("click", e => {

    e.preventDefault();

    $("#loginBox").classList.add("hidden");

    $("#registerBox").classList.remove("hidden");

});


$("#showLogin")?.addEventListener("click", e => {

    e.preventDefault();

    $("#registerBox").classList.add("hidden");

    $("#loginBox").classList.remove("hidden");

});


/* ================= REGISTER ================= */

$("#registerForm")?.addEventListener("submit", async e => {

    e.preventDefault();

    const name =
        $("#registerName").value.trim();

    const email =
        $("#registerEmail").value.trim();

    const password =
        $("#registerPassword").value;

    if (!name || !email || !password) {

        showToast("Please fill all fields.");

        return;
    }

    try {

        const result =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        await updateProfile(
            result.user,
            {
                displayName: name
            }
        );


        await setDoc(
            doc(db, "users", result.user.uid),
            {
                uid: result.user.uid,
                name: name,
                username: makeUsername(name),
                email: email,
                followers: [],
                following: [],
                createdAt: serverTimestamp()
            }
        );


        showToast(
            "Account created successfully!"
        );


        $("#registerForm").reset();

    } catch (error) {

        console.error(error);

        showToast(
            firebaseError(error)
        );

    }

});


/* ================= LOGIN ================= */

$("#loginForm")?.addEventListener("submit", async e => {

    e.preventDefault();

    const email =
        $("#loginEmail").value.trim();

    const password =
        $("#loginPassword").value;

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        $("#loginForm").reset();

        showToast("Welcome back!");

    } catch (error) {

        console.error(error);

        showToast(
            firebaseError(error)
        );

    }

});


/* ================= AUTH STATE ================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            currentUser = null;

            $("#authScreen")
                .classList
                .remove("hidden");

            $("#appScreen")
                .classList
                .add("hidden");

            return;
        }


        currentUser = user;


        $("#authScreen")
            .classList
            .add("hidden");

        $("#appScreen")
            .classList
            .remove("hidden");


        await createUserDocument();

        updateUserUI();

        await loadUsers();

        listenPosts();

        renderProfile();

    }
);


/* ================= USER DOCUMENT ================= */

async function createUserDocument() {

    const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );

    const snapshot =
        await getDoc(userRef);


    if (!snapshot.exists()) {

        await setDoc(
            userRef,
            {
                uid: currentUser.uid,
                name:
                    currentUser.displayName ||
                    "User",
                username:
                    makeUsername(
                        currentUser.displayName ||
                        "user"
                    ),
                email:
                    currentUser.email || "",
                followers: [],
                following: [],
                createdAt:
                    serverTimestamp()
            }
        );

    }

}


/* ================= UPDATE UI ================= */

function updateUserUI() {

    const name =
        currentUser.displayName ||
        "User";

    $("#sideName").textContent =
        name;

    $("#sideEmail").textContent =
        currentUser.email || "";

    $("#sideAvatar").textContent =
        getInitial(name);

    $("#composerAvatar").textContent =
        getInitial(name);

    $("#profileAvatar").textContent =
        getInitial(name);

    $("#profileName").textContent =
        name;

    $("#profileEmail").textContent =
        currentUser.email || "";

}


/* ================= LOAD USERS ================= */

async function loadUsers() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        allUsers =
            snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        renderSuggestions();

        renderPeople();

    } catch (error) {

        console.error(
            "Users error:",
            error
        );

    }

}


/* ================= SEARCH ================= */

$("#globalSearch")?.addEventListener(
    "input",
    () => {

        const value =
            $("#globalSearch")
                .value
                .trim()
                .toLowerCase();


        if (!value) {

            $("#searchResults")
                .classList
                .add("hidden");

            $("#searchResults")
                .innerHTML = "";

            return;
        }


        const results =
            allUsers.filter(user => {

                if (
                    user.id ===
                    currentUser?.uid
                ) {
                    return false;
                }


                const name =
                    (
                        user.name ||
                        ""
                    ).toLowerCase();


                const username =
                    (
                        user.username ||
                        ""
                    ).toLowerCase();


                const email =
                    (
                        user.email ||
                        ""
                    ).toLowerCase();


                return (
                    name.includes(value) ||
                    username.includes(value) ||
                    email.includes(value)
                );

            });


        showSearchResults(results);

    }
);


/* ================= SEARCH RESULTS ================= */

function showSearchResults(results) {

    const box =
        $("#searchResults");


    box.classList.remove("hidden");


    if (!results.length) {

        box.innerHTML = `
            <div class="search-empty">

                <strong>
                    No results found
                </strong>

                <span>
                    Try another name or username.
                </span>

            </div>
        `;

        return;
    }


    box.innerHTML =
        results
            .slice(0, 10)
            .map(user => {

                const following =
                    getFollowing()
                        .includes(user.id);


                return `

                    <div
                        class="search-user"
                    >

                        <div
                            class="search-avatar"
                        >
                            ${getInitial(
                                user.name ||
                                "User"
                            )}
                        </div>


                        <div
                            class="search-user-info"
                        >

                            <strong>
                                ${escapeHTML(
                                    user.name ||
                                    "User"
                                )}
                            </strong>

                            <span>
                                @${escapeHTML(
                                    user.username ||
                                    makeUsername(
                                        user.name
                                    )
                                )}
                            </span>

                        </div>


                        <button
                            class="
                                search-follow
                                ${
                                    following
                                        ? "following"
                                        : ""
                                }
                            "
                            data-search-follow="${user.id}"
                        >
                            ${
                                following
                                    ? "Following"
                                    : "Follow"
                            }
                        </button>

                    </div>
                `;

            })
            .join("");


    attachSearchButtons();

}


function attachSearchButtons() {

    $$("[data-search-follow]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async e => {

                    e.stopPropagation();

                    await toggleFollow(
                        button.dataset.searchFollow
                    );

                    const value =
                        $("#globalSearch")
                            .value
                            .trim()
                            .toLowerCase();

                    if (value) {

                        const results =
                            allUsers.filter(
                                user =>
                                    (
                                        user.name ||
                                        ""
                                    )
                                    .toLowerCase()
                                    .includes(value) ||
                                    (
                                        user.username ||
                                        ""
                                    )
                                    .toLowerCase()
                                    .includes(value)
                            );

                        showSearchResults(
                            results
                        );

                    }

                }
            );

        });

}


/* ================= CREATE POST ================= */

$("#publishPost")?.addEventListener(
    "click",
    async () => {

        const text =
            $("#postText")
                .value
                .trim();


        if (!text && !currentImage) {

            showToast(
                "Write something first."
            );

            return;
        }


        try {

            $("#publishPost")
                .disabled = true;


            await addDoc(
                collection(db, "posts"),
                {
                    uid:
                        currentUser.uid,

                    author:
                        currentUser.displayName ||
                        "User",

                    text:
                        text,

                    image:
                        currentImage,

                    likes: [],

                    comments: [],

                    createdAt:
                        serverTimestamp()
                }
            );


            $("#postText").value = "";

            currentImage = "";

            $("#imagePreview")
                .innerHTML = "";

            $("#imagePreview")
                .classList
                .add("hidden");


            showToast(
                "Post published!"
            );

        } catch (error) {

            console.error(error);

            showToast(
                "Could not publish post."
            );

        } finally {

            $("#publishPost")
                .disabled = false;

        }

    }
);


/* ================= POSTS REALTIME ================= */

function listenPosts() {

    if (unsubscribePosts) {

        unsubscribePosts();

    }


    const postsQuery =
        query(
            collection(db, "posts"),
            orderBy(
                "createdAt",
                "desc"
            )
        );


    unsubscribePosts =
        onSnapshot(
            postsQuery,
            snapshot => {

                allPosts =
                    snapshot.docs.map(
                        item => ({
                            id: item.id,
                            ...item.data()
                        })
                    );


                renderFeed(
                    allPosts
                );

                renderProfile();

            },
            error => {

                console.error(error);

            }
        );

}


/* ================= FEED ================= */

function renderFeed(posts) {

    const feed =
        $("#feed");


    if (!posts.length) {

        feed.innerHTML = `
            <div class="empty">

                <strong>
                    No posts yet
                </strong>

                <span>
                    Be the first to share something.
                </span>

            </div>
        `;

        return;
    }


    feed.innerHTML =
        posts
            .map(createPost)
            .join("");


    attachPostEvents();

}


/* ================= POST HTML ================= */

function createPost(post) {

    const likes =
        Array.isArray(post.likes)
            ? post.likes
            : [];


    const comments =
        Array.isArray(post.comments)
            ? post.comments
            : [];


    const liked =
        likes.includes(
            currentUser.uid
        );


    const own =
        post.uid ===
        currentUser.uid;


    return `

        <article
            class="post"
            data-post="${post.id}"
        >

            <div class="post-header">

                <div class="author">

                    <div class="avatar">
                        ${getInitial(
                            post.author
                        )}
                    </div>

                    <div>

                        <div class="author-name">
                            ${escapeHTML(
                                post.author ||
                                "User"
                            )}
                        </div>

                        <span class="post-time">
                            ${formatTime(
                                post.createdAt
                            )}
                        </span>

                    </div>

                </div>


                ${
                    own
                        ? `
                            <button
                                class="delete-button"
                                data-delete="${post.id}"
                            >
                                Delete
                            </button>
                        `
                        : ""
                }

            </div>


            ${
                post.text
                    ? `
                        <div class="post-text">
                            ${escapeHTML(
                                post.text
                            )}
                        </div>
                    `
                    : ""
            }


            ${
                post.image
                    ? `
                        <img
                            class="post-image"
                            src="${post.image}"
                        >
                    `
                    : ""
            }


            <div class="post-stats">

                <span>
                    ${likes.length} likes
                </span>

                <span>
                    ${comments.length} comments
                </span>

            </div>


            <div class="post-actions">

                <button
                    class="
                        like-button
                        ${
                            liked
                                ? "liked"
                                : ""
                        }
                    "
                    data-like="${post.id}"
                >
                    ${
                        liked
                            ? "♥ Liked"
                            : "♡ Like"
                    }
                </button>


                <button
                    data-focus-comment="${post.id}"
                >
                    💬 Comment
                </button>

            </div>


            <div class="comments">

                ${
                    comments
                        .map(comment => `
                            <div class="comment">

                                <b>
                                    ${escapeHTML(
                                        comment.name ||
                                        "User"
                                    )}
                                </b>

                                ${escapeHTML(
                                    comment.text ||
                                    ""
                                )}

                            </div>
                        `)
                        .join("")
                }


                <form
                    class="comment-form"
                    data-comment="${post.id}"
                >

                    <input
                        type="text"
                        placeholder="Write a comment..."
                        required
                    >

                    <button>
                        Send
                    </button>

                </form>

            </div>

        </article>

    `;

}


/* ================= POST EVENTS ================= */

function attachPostEvents() {

    $$("[data-like]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    toggleLike(
                        button.dataset.like
                    )
            );

        });


    $$("[data-delete]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    deletePost(
                        button.dataset.delete
                    )
            );

        });


    $$("[data-comment]")
        .forEach(form => {

            form.addEventListener(
                "submit",
                e => {

                    e.preventDefault();

                    const input =
                        form.querySelector(
                            "input"
                        );

                    addComment(
                        form.dataset.comment,
                        input
                    );

                }
            );

        });


    $$("[data-focus-comment]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const post =
                        document.querySelector(
                            `[data-post="${button.dataset.focusComment}"]`
                        );

                    post
                        ?.querySelector(
                            ".comment-form input"
                        )
                        ?.focus();

                }
            );

        });

}


/* ================= LIKE ================= */

async function toggleLike(postId) {

    const ref =
        doc(
            db,
            "posts",
            postId
        );


    const snapshot =
        await getDoc(ref);


    if (!snapshot.exists()) return;


    const post =
        snapshot.data();


    const likes =
        post.likes || [];


    if (
        likes.includes(
            currentUser.uid
        )
    ) {

        await updateDoc(
            ref,
            {
                likes:
                    arrayRemove(
                        currentUser.uid
                    )
            }
        );

    } else {

        await updateDoc(
            ref,
            {
                likes:
                    arrayUnion(
                        currentUser.uid
                    )
            }
        );

    }

}


/* ================= COMMENT ================= */

async function addComment(
    postId,
    input
) {

    const text =
        input.value.trim();


    if (!text) return;


    try {

        await updateDoc(
            doc(
                db,
                "posts",
                postId
            ),
            {
                comments:
                    arrayUnion({
                        uid:
                            currentUser.uid,

                        name:
                            currentUser.displayName ||
                            "User",

                        text:
                            text,

                        createdAt:
                            new Date()
                                .toISOString()
                    })
            }
        );


        input.value = "";

    } catch (error) {

        console.error(error);

        showToast(
            "Comment failed."
        );

    }

}


/* ================= DELETE ================= */

async function deletePost(postId) {

    const post =
        allPosts.find(
            item =>
                item.id === postId
        );


    if (
        !post ||
        post.uid !==
        currentUser.uid
    ) {

        return;
    }


    if (
        !confirm(
            "Delete this post?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "posts",
                postId
            )
        );

        showToast(
            "Post deleted."
        );

    } catch (error) {

        console.error(error);

    }

}


/* ================= IMAGE ================= */

$("#imageInput")?.addEventListener(
    "change",
    e => {

        const file =
            e.target.files[0];


        if (!file) return;


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showToast(
                "Please select an image."
            );

            return;
        }


        if (
            file.size >
            2 * 1024 * 1024
        ) {

            showToast(
                "Image must be smaller than 2MB."
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            currentImage =
                reader.result;


            $("#imagePreview")
                .classList
                .remove("hidden");


            $("#imagePreview")
                .innerHTML = `
                    <img
                        src="${currentImage}"
                    >
                `;

        };


        reader.readAsDataURL(file);

    }
);


/* ================= EMOJI ================= */

$("#emojiBtn")?.addEventListener(
    "click",
    () => {

        $("#postText").value +=
            " 😊";

        $("#postText").focus();

    }
);


/* ================= NAVIGATION ================= */

$$("[data-page]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const page =
                    button.dataset.page;


                $$(".page")
                    .forEach(item =>
                        item.classList.add(
                            "hidden"
                        )
                    );


                $(`#${page}Page`)
                    ?.classList
                    .remove("hidden");


                $$(".menu")
                    .forEach(item =>
                        item.classList.toggle(
                            "active",
                            item.dataset.page === page
                        )
                    );


                if (page === "discover") {

                    renderPeople();

                }


                if (page === "profile") {

                    renderProfile();

                }

            }
        );

    });


/* ================= DISCOVER ================= */

$("#peopleSearch")?.addEventListener(
    "input",
    e => {

        renderPeople(
            e.target.value
        );

    }
);


function renderPeople(search = "") {

    const container =
        $("#peopleList");


    if (!container) return;


    const value =
        search
            .trim()
            .toLowerCase();


    const users =
        allUsers.filter(user => {

            if (
                user.id ===
                currentUser.uid
            ) {

                return false;

            }


            return (
                !value ||
                (
                    user.name ||
                    ""
                )
                .toLowerCase()
                .includes(value) ||

                (
                    user.username ||
                    ""
                )
                .toLowerCase()
                .includes(value) ||

                (
                    user.email ||
                    ""
                )
                .toLowerCase()
                .includes(value)
            );

        });


    if (!users.length) {

        container.innerHTML = `
            <div class="empty">

                <strong>
                    No people found
                </strong>

                <span>
                    Try another search.
                </span>

            </div>
        `;

        return;
    }


    container.innerHTML =
        users
            .map(user => {

                const following =
                    getFollowing()
                        .includes(user.id);


                return `

                    <div class="person">

                        <div class="avatar">
                            ${getInitial(
                                user.name
                            )}
                        </div>

                        <div class="person-info">

                            <strong>
                                ${escapeHTML(
                                    user.name ||
                                    "User"
                                )}
                            </strong>

                            <small>
                                @${escapeHTML(
                                    user.username ||
                                    ""
                                )}
                            </small>

                        </div>

                        <button
                            class="
                                follow-button
                                ${
                                    following
                                        ? "following"
                                        : ""
                                }
                            "
                            data-follow="${user.id}"
                        >
                            ${
                                following
                                    ? "Following"
                                    : "Follow"
                            }
                        </button>

                    </div>

                `;

            })
            .join("");


    attachFollowButtons();

}


/* ================= FOLLOW ================= */

function getFollowing() {

    const me =
        allUsers.find(
            user =>
                user.id ===
                currentUser?.uid
        );


    return me?.following || [];

}


async function toggleFollow(
    targetId
) {

    if (
        targetId ===
        currentUser.uid
    ) {

        return;

    }


    const myRef =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const targetRef =
        doc(
            db,
            "users",
            targetId
        );


    const mySnap =
        await getDoc(myRef);


    const targetSnap =
        await getDoc(targetRef);


    if (
        !mySnap.exists() ||
        !targetSnap.exists()
    ) {

        return;

    }


    const following =
        mySnap.data().following || [];


    const isFollowing =
        following.includes(
            targetId
        );


    if (isFollowing) {

        await updateDoc(
            myRef,
            {
                following:
                    arrayRemove(
                        targetId
                    )
            }
        );


        await updateDoc(
            targetRef,
            {
                followers:
                    arrayRemove(
                        currentUser.uid
                    )
            }
        );

    } else {

        await updateDoc(
            myRef,
            {
                following:
                    arrayUnion(
                        targetId
                    )
            }
        );


        await updateDoc(
            targetRef,
            {
                followers:
                    arrayUnion(
                        currentUser.uid
                    )
            }
        );

    }


    await loadUsers();

    renderPeople(
        $("#peopleSearch")?.value || ""
    );

}


/* ================= FOLLOW BUTTONS ================= */

function attachFollowButtons() {

    $$("[data-follow]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    toggleFollow(
                        button.dataset.follow
                    )
            );

        });

}


/* ================= SUGGESTIONS ================= */

function renderSuggestions() {
    // Reserved for future recommendation system.
}


/* ================= PROFILE ================= */

async function renderProfile() {

    if (!currentUser) return;


    const posts =
        allPosts.filter(
            post =>
                post.uid ===
                currentUser.uid
        );


    $("#postCount")
        .textContent =
        posts.length;


    const userSnap =
        await getDoc(
            doc(
                db,
                "users",
                currentUser.uid
            )
        );


    if (userSnap.exists()) {

        const user =
            userSnap.data();


        $("#followerCount")
            .textContent =
            (user.followers || [])
                .length;


        $("#followingCount")
            .textContent =
            (user.following || [])
                .length;

    }


    const feed =
        $("#profileFeed");


    if (!posts.length) {

        feed.innerHTML = `
            <div class="empty">

                <strong>
                    No posts yet
                </strong>

                <span>
                    Your posts will appear here.
                </span>

            </div>
        `;

        return;
    }


    feed.innerHTML =
        posts
            .map(createPost)
            .join("");


    attachPostEvents();

}


/* ================= DARK MODE ================= */

$("#themeBtn")?.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );

        localStorage.setItem(
            "connectlyDark",
            document.body.classList.contains(
                "dark"
            )
                ? "1"
                : "0"
        );

    }
);


if (
    localStorage.getItem(
        "connectlyDark"
    ) === "1"
) {

    document.body.classList.add(
        "dark"
    );

}


/* ================= LOGOUT ================= */

$("#logoutBtn")?.addEventListener(
    "click",
    async () => {

        await signOut(auth);

    }
);


/* ================= CLOSE SEARCH ================= */

document.addEventListener(
    "click",
    e => {

        if (
            !e.target.closest(
                ".search-wrapper"
            )
        ) {

            $("#searchResults")
                ?.classList
                .add("hidden");

        }

    }
);


/* ================= UTILITIES ================= */

function getInitial(name) {

    return (
        String(name || "U")
            .trim()
            .charAt(0)
            .toUpperCase()
    );

}


function makeUsername(name) {

    return String(
        name || "user"
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        )
        .slice(0, 20);

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatTime(timestamp) {

    if (!timestamp) {
        return "Just now";
    }


    const date =
        typeof timestamp.toDate ===
        "function"
            ? timestamp.toDate()
            : new Date(timestamp);


    const seconds =
        Math.floor(
            (
                Date.now() -
                date.getTime()
            ) / 1000
        );


    if (seconds < 60)
        return "Just now";


    const minutes =
        Math.floor(seconds / 60);


    if (minutes < 60)
        return `${minutes}m ago`;


    const hours =
        Math.floor(minutes / 60);


    if (hours < 24)
        return `${hours}h ago`;


    const days =
        Math.floor(hours / 24);


    if (days < 7)
        return `${days}d ago`;


    return date.toLocaleDateString();

}


function showToast(message) {

    const toast =
        $("#toast");


    if (!toast) return;


    toast.textContent =
        message;


    toast.classList.add("show");


    setTimeout(
        () => {
            toast.classList.remove("show");
        },
        2500
    );

}


function firebaseError(error) {

    const errors = {

        "auth/email-already-in-use":
            "This email is already registered.",

        "auth/invalid-email":
            "Invalid email address.",

        "auth/weak-password":
            "Password must be at least 6 characters.",

        "auth/invalid-credential":
            "Email or password is incorrect.",

        "auth/user-not-found":
            "User not found.",

        "auth/wrong-password":
            "Wrong password."

    };


    return (
        errors[error.code] ||
        "Something went wrong."
    );

}