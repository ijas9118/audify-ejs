document
  .querySelector(".payment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const paymentMethod = document.querySelector(
      'input[name="paymentMethod"]:checked',
    ).value;
    const paymentButton = document.getElementById("confirmBtn");
    const orderId = paymentButton.dataset.orderid;
    const finalTotal = paymentButton.dataset.finaltotal;
    console.log(paymentMethod);

    let Toast = Swal.mixin({
      toast: true,
      position: "top", // Adjust position as needed
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });

    try {
      if (paymentMethod === "Razorpay") {
        const amount = finalTotal;
        const currency = "INR";
        const receiptId = "qwerty1";

        const response = await fetch(`/checkout/order/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amount * 100,
            currency,
            receipt: receiptId,
          }), // Convert the object to a JSON string
        });
        const { order, orderData } = await response.json();

        var options = {
          key: "rzp_test_RaOEV8768UB36C", // Enter the Key ID generated from the Dashboard
          amount,
          currency,
          name: "Audify", //your business name
          description: "Test Transaction",
          order_id: order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
          handler: async function (response) {
            const razorpayPaymentId = response.razorpay_payment_id;
            const razorpayOrderId = response.razorpay_order_id;
            const razorpaySignature = response.razorpay_signature;

            try {
              const finalCheckoutResponse = await fetch("/checkout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ orderId, paymentMethod }),
              });

              const paymentResult = await finalCheckoutResponse.json();
              console.log(paymentResult);

              if (paymentResult.success) {
                await Toast.fire({
                  icon: "success",
                  title: "Payment completed successful!",
                });
                window.location.href = `/checkout/order-success/${orderId}`;
              } else {
                Toast.fire({
                  icon: "error",
                  title:
                    paymentResult.message ||
                    "An error occurred while finalizing the order",
                });
              }
            } catch (error) {
              console.error("Error during final checkout:", error);
              Toast.fire({
                icon: "error",
                title:
                  "An unexpected error occurred while finalizing the order",
              });
            }
          },
          prefill: {
            //We recommend using the prefill parameter to auto-fill customer's contact information, especially their phone number
            name: orderData.name, //your customer's name
            contact: orderData.mobile, //Provide the customer's phone number for better conversion rates
          },
          notes: {
            address: "Razorpay Corporate Office",
          },
          theme: {
            color: "#3399cc",
          },
        };
        var rzp1 = new window.Razorpay(options);
        rzp1.on("payment.failed", function (response) {
          alert(response.error.code);
          alert(response.error.description);
          alert(response.error.source);
          alert(response.error.step);
          alert(response.error.reason);
          alert(response.error.metadata.order_id);
          alert(response.error.metadata.payment_id);
        });

        rzp1.open();
      } else if (paymentMethod === "COD") {
        let response = await fetch("/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId, paymentMethod }),
        });
        const result = await response.json(); // Parse the JS`ON response

        if (result.success) {
          await Toast.fire({
            icon: "success",
            title: result.message,
          });
          window.location.href = `/checkout/order-success/${orderId}`; // Change this URL as needed
        } else {
          Toast.fire({
            icon: "error",
            title:
              result.message || "An error occurred while placing the order",
          });
        }
      } else if (paymentMethod === "Wallet") {
        let response = await fetch("/checkout/wallet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId, paymentMethod }),
        });
        const result = await response.json(); // Parse the JS`ON response

        if (result.success) {
          await Toast.fire({
            icon: "success",
            title: result.message,
          });
          window.location.href = `/checkout/order-success/${orderId}`; // Change this URL as needed
        } else {
          Toast.fire({
            icon: "error",
            title:
              result.message || "An error occurred while placing the order",
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      Toast.fire({
        icon: "error",
        title: `An unexpected error occurred ${error}`,
      });
    }
  });
