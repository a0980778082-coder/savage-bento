function calculateSalary(month) {
    let bonus = Number(window.currentBonus) || 0;
    if (userRate >= 1000) {
        let total = Number(userRate) + bonus;
        return { text: `本越薪資預估：$${total.toLocaleString()} (含獎金)` };
    }
    
    let hrs = 0;
    const myS = scheduleData.filter(i => String(i.employeeName).trim() === currentUser.trim() && i.date.startsWith(month));
    
    myS.forEach(i => {
        // 重點：如果該列有 actualHrs (手動調整值)，就優先使用
        if (i.actualHrs && !isNaN(i.actualHrs)) {
            hrs += Number(i.actualHrs);
        } else {
            const n = i.timeSlot.match(/\d+/g);
            if (n && n.length >= 2) { 
                let h = parseInt(n[1]) - parseInt(n[0]); 
                if (h > 0) hrs += h; 
            }
        }
    });
    
    let total = (hrs * userRate) + bonus;
    return { text: `本越總時數：${hrs}hr / 薪資預估：$${total.toLocaleString()}` };
}