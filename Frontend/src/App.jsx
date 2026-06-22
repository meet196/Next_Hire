import { RouterProvider } from "react-router-dom";
import { router } from "./app.routes.jsx";   
import {AuthProvider} from "./Features/auth/auth.context.jsx";
import { InterviewProvider } from "./Features/interview/interview.context.jsx";
import { Toaster } from "react-hot-toast";


function App() {
    return(
        <AuthProvider>
            <Toaster position="top-center" />
            <InterviewProvider>
                <RouterProvider router={router} />
            </InterviewProvider>
        </AuthProvider>
    )
}

export default App;