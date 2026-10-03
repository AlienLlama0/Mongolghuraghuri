import Header from "../Header/Header"
import RouteControls from "../RouteControls/RouteControls"
import Sidebar from "../Sidebar/Sidebar"
import MarsMapLoader from "../MarsMap/MarsMapLoader"

export default function MissionPlanner(){
    return(
        <div className="flex min-h-dvh flex-col lg:h-dvh">
            <Header />
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <Sidebar />
                <main className="order-1 flex h-[68vh] min-h-95 flex-col lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1">
                    <MarsMapLoader />
                </main>
            </div>
        </div>
    )
}