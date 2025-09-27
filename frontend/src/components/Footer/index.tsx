import './footer.scss'
const Footer = () => {
    return (
        <footer id="footer" className="footer">
            <div className="container">
                <div className="container copyright text-center mt-4">
                    <p>© <span>Copyright</span> <strong className="px-1 sitename">Yummy</strong> <span>All Rights Reserved</span></p>
                    <div className="credits">
                        Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
                    </div>
                </div>
            </div>

        </footer>
    )
}

export default Footer;