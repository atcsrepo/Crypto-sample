module.exports = {
  overlay: {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    zIndex: "1500"
  },
  modal: {
    margin: "0 auto",
    width: "400px",
    zIndex: "1700",
    backgroundColor: "white",
    textAlign: "center",
    border: "2px solid #F83A26"
  },
  title: {
    margin: "1rem 2rem 1rem 2rem",
    fontSize: "1.3rem"
  },
  message: {
    margin: "0.5rem 2rem 0.5rem 2rem",
    color: "black",
    fontSize: "1.3rem",
  },
  confirm: {
    fontSize: "1.2rem",
    backgroundColor: "#48C9B0",
    color: "white",
    margin: "1rem 2rem 1rem 2rem",
    padding: "0.5rem",
    display: "inline-block",
    cursor: "pointer"
  }
}